// src/app/agenda/agenda.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '../core/auth.service';

/** ===== Tipos de la Agenda (mismos que tu UI) ===== */
export type CitaStatus =
  | 'CONFIRMADA'
  | 'PENDIENTE'
  | 'NUEVA'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'DISPONIBLE';

export interface CitaItem {
  id: string;            // UI usa string; backend trae number
  hora: string;          // 'HH:MM' (24h)
  pacienteId?: string;   // id numérico -> string para UI
  paciente?: string;     // nombre para mostrar
  motivo?: string;
  status: CitaStatus;
  notas?: string;
}

/** fechaISO es la "key" del día en formato dd-MM-yyyy */
export interface AgendaDia {
  fechaISO: string;      // 'dd-MM-yyyy'
  items: CitaItem[];
}

type PacienteRow = {
  id?: number | string;
  nombres?: string;
  apellidos?: string;
  nombre?: string; // por si tu API ya devuelve nombre completo
};

@Injectable({ providedIn: 'root' })
export class AgendaService {
  private http = inject(HttpClient);
  private authService = inject(AuthService); // Inyectamos el servicio de autenticación
  //private readonly baseUrl = 'http://localhost:3000';
  private readonly baseUrl = 'https://odonto-clinic.onrender.com';

  // ================== Helpers de fecha y mapeos ==================

  /** Convierte 'dd-MM-yyyy' + 'HH:MM' -> Date */
  private toBackendDate(fechaISO: string, hora?: string): Date {
    const [dd, mm, yyyy] = fechaISO.split('-').map(Number);
    const [HH, MM] = (hora ?? '00:00').split(':').map(Number);
    return new Date(yyyy, mm - 1, dd, HH || 0, MM || 0, 0, 0);
  }

  /** Date -> 'dd-MM-yyyy' */
  private toISO_ddMMyyyy(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  /** Normaliza 'HH:MM[:ss]' -> 'HH:MM' */
  private normHora(h: string | null | undefined): string {
    return (h ?? '').toString().slice(0, 5);
  }

  /** DB row -> CitaItem que espera tu UI */
  private mapRowToItem = (row: any): CitaItem => ({
    id: String(row?.id ?? ''),
    hora: this.normHora(row?.hora),
    pacienteId: row?.pacienteId != null ? String(row.pacienteId) : undefined,
    paciente: row?.pacienteNombre ?? undefined, // si el backend lo enviara
    motivo: row?.motivo ?? undefined,
    status: row?.estado as CitaStatus,
    notas: row?.notas ?? undefined,
  });

  /** Ordena por hora ascendente */
  private sortByHora(items: CitaItem[]): CitaItem[] {
    return [...items].sort((a, b) => a.hora.localeCompare(b.hora));
  }

  // ====== Utilidades para nombres de pacientes SIN tocar backend ======

  private fullName(p: PacienteRow | undefined): string | undefined {
    if (!p) return undefined;
    const direct = (p.nombre ?? '').trim();
    if (direct) return direct;
    const fn = [p.nombres, p.apellidos].filter(Boolean).join(' ').trim();
    return fn || undefined;
  }

  private normalizeName(s: string | undefined): string {
    return (s ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** GET /pacientes/:id -> nombre */
  private fetchPacienteNombre(id: string): Observable<string | undefined> {
    if (!id) return of(undefined);
    return this.http.get<PacienteRow>(`${this.baseUrl}/pacientes/${id}`).pipe(
      map(p => this.fullName(p)),
      catchError(() => of(undefined))
    );
  }

  /** GET /pacientes -> lista */
  private fetchPacientes(): Observable<PacienteRow[]> {
    return this.http.get<PacienteRow[]>(`${this.baseUrl}/pacientes`).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Resuelve pacienteId:
   * 1) Si ya viene pacienteId => lo usamos.
   * 2) Si viene 'paciente' (texto) => buscamos en /pacientes el primero que haga match por nombre.
   * 3) Si no encontramos, devolvemos undefined (no cambia el paciente).
   */
  private resolvePacienteId(payload: { pacienteId?: string; paciente?: string }): Observable<number | undefined> {
    if (payload.pacienteId) return of(Number(payload.pacienteId));
    const typed = this.normalizeName(payload.paciente);
    if (!typed) return of(undefined);

    return this.fetchPacientes().pipe(
      map(list => {
        const match = list.find(p => this.normalizeName(this.fullName(p)) === typed);
        return match?.id != null ? Number(match.id) : undefined;
      })
    );
  }

  /** Enriquecer arreglo con nombres (1 request por id único) */
  private enrichWithPacientes(items: CitaItem[]): Observable<CitaItem[]> {
    const ids = Array.from(
      new Set(items.filter(it => !it.paciente && it.pacienteId).map(it => it.pacienteId!))
    );
    if (ids.length === 0) return of(items);

    const calls = ids.map(id =>
      this.fetchPacienteNombre(id).pipe(map(name => [id, name] as const))
    );

    return forkJoin(calls).pipe(
      map(pairs => {
        const dict = new Map<string, string | undefined>(pairs);
        return items.map(it =>
          it.paciente || !it.pacienteId ? it : { ...it, paciente: dict.get(it.pacienteId!) }
        );
      })
    );
  }

  // ================== API PÚBLICA (usando tus endpoints actuales) ==================

  /** GET /citas (filtramos por fecha en el cliente y completamos nombres) */
  getAgendaDia(fechaISO: string): Observable<AgendaDia> {
    const currentUser = this.authService.getCurrentUser(); // Obtenemos el usuario logueado
    if (!currentUser) {
      throw new Error('Usuario no logueado');
    }

    return this.http.get<any[]>(`${this.baseUrl}/citas`, { params: { date: fechaISO } }).pipe(
      map(rows => {
        let filtroUsuarioId: number | undefined = undefined;
        if (currentUser.rol === 'RECEPCIONISTA' && currentUser.refreshToken) {
          // El campo refreshToken es el id del doctor relacionado (string), lo convertimos a int
          filtroUsuarioId = parseInt(currentUser.refreshToken, 10);
        } else {
          // Aseguramos que el id sea número
          filtroUsuarioId = typeof currentUser.id === 'string' ? parseInt(currentUser.id, 10) : currentUser.id;
        }
        const items = (rows ?? [])
          .filter((r: any) => r.usuarioId === filtroUsuarioId)
          .filter((r: any) => this.toISO_ddMMyyyy(new Date(r?.fecha)) === fechaISO)
          .map(this.mapRowToItem);
        return this.sortByHora(items);
      }),
      switchMap(items => this.enrichWithPacientes(items)),
      map(items => ({ fechaISO, items }))
    );
  }

  /** POST /citas */
  crearCita(body: {
    fechaISO: string;
    hora: string;
    pacienteId: string;      // id del paciente existente (string en UI)
    pacienteNombre: string;  // solo UI; backend lo ignora
    motivo: string;
    notas?: string;
  }): Observable<CitaItem> {
    const currentUser = this.authService.getCurrentUser(); // Obtenemos el usuario logueado
    if (!currentUser) {
      throw new Error('Usuario no logueado');
    }

    let usuarioId: number;
    if (currentUser.rol === 'RECEPCIONISTA' && currentUser.refreshToken) {
      usuarioId = parseInt(currentUser.refreshToken, 10);
    } else {
      usuarioId = typeof currentUser.id === 'string' ? parseInt(currentUser.id, 10) : currentUser.id;
    }

    const payload = {
      pacienteId: Number(body.pacienteId),
      usuarioId,
      fecha: this.toBackendDate(body.fechaISO, body.hora),
      hora: this.normHora(body.hora),
      motivo: body.motivo,
      estado: 'NUEVA' as CitaStatus,
      notas: body.notas ?? null,
    };

    return this.http.post<any>(`${this.baseUrl}/citas`, payload).pipe(
      map(this.mapRowToItem),
      switchMap(item =>
        item.paciente
          ? of(item)
          : this.fetchPacienteNombre(item.pacienteId ?? '').pipe(
              map(name => ({ ...item, paciente: name }))
            )
      )
    );
  }

  /** PATCH /citas/:id (actualiza estado en el mismo endpoint) */
  actualizarEstado(id: string, status: CitaStatus, _fechaISO: string): Observable<CitaItem> {
    const payload = { estado: status };
    return this.http.patch<any>(`${this.baseUrl}/citas/${id}`, payload).pipe(
      map(this.mapRowToItem),
      switchMap(item =>
        item.paciente
          ? of(item)
          : this.fetchPacienteNombre(item?.pacienteId ?? '').pipe(
              map(name => ({ ...item, paciente: name }))
            )
      )
    );
  }

  /**
   * PATCH /citas/:id  (editar hora/motivo/notas y/o mover de día y/o CAMBIAR PACIENTE)
   * - Siempre mandamos 'fecha' Y 'hora' para evitar que la BD conserve la hora vieja.
   * - Si el usuario escribe otro paciente por texto, buscamos su id y lo enviamos.
   */
  actualizarCita(
    id: string,
    fechaISO: string,
    payload: Partial<Pick<CitaItem, 'hora'|'paciente'|'motivo'|'notas'>> & { pacienteId?: string }
  ): Observable<CitaItem> {
    const horaFinal = this.normHora(payload.hora ?? '');

    return this.resolvePacienteId({ pacienteId: payload.pacienteId, paciente: payload.paciente }).pipe(
      switchMap(resolvedPacienteId => {
        const patch: any = {
          fecha: this.toBackendDate(fechaISO, horaFinal || payload.hora),
          hora: horaFinal || this.normHora(payload.hora),
        };
        if (payload.motivo !== undefined) patch.motivo = payload.motivo;
        if (payload.notas  !== undefined) patch.notas  = payload.notas;
        if (resolvedPacienteId != null)   patch.pacienteId = resolvedPacienteId;

        return this.http.patch<any>(`${this.baseUrl}/citas/${id}`, patch);
      }),
      map(this.mapRowToItem),
      switchMap(item =>
        this.fetchPacienteNombre(item?.pacienteId ?? '').pipe(
          map(name => ({ ...item, paciente: name }))
        )
      )
    );
  }

  /** DELETE /citas/:id */
  eliminarCita(_fechaISO: string, id: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/citas/${id}`);
  }

  // Mock OFF
  clearMock(): void { /* no-op */ }
}
