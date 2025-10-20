// src/app/agenda/agenda.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

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
  private readonly baseUrl = 'http://localhost:3000';

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

  // ====== Enriquecer con nombres de pacientes SIN tocar backend ======

  /** Obtiene nombre del paciente por id; maneja errores devolviendo undefined */
  private fetchPacienteNombre(id: string): Observable<string | undefined> {
    if (!id) return of(undefined);
    return this.http.get<PacienteRow>(`${this.baseUrl}/pacientes/${id}`).pipe(
      map(p =>
        (p?.nombre && p.nombre.trim()) ||
        [p?.nombres, p?.apellidos].filter(Boolean).join(' ').trim() ||
        undefined
      ),
      catchError(() => of(undefined))
    );
  }

  /** Dado un arreglo, trae nombres faltantes (1 request por id único) */
  private enrichWithPacientes(items: CitaItem[]): Observable<CitaItem[]> {
    const ids = Array.from(
      new Set(
        items
          .filter(it => it.paciente == null && it.pacienteId)
          .map(it => it.pacienteId!) // non-null
      )
    );

    if (ids.length === 0) return of(items);

    const calls = ids.map(id =>
      this.fetchPacienteNombre(id).pipe(map(name => [id, name] as const))
    );

    return forkJoin(calls).pipe(
      map(pairs => {
        const dict = new Map<string, string | undefined>(pairs);
        return items.map(it =>
          it.paciente || !it.pacienteId
            ? it
            : { ...it, paciente: dict.get(it.pacienteId!) }
        );
      })
    );
  }

  // ================== API PÚBLICA (usando tus endpoints actuales) ==================

  /** GET /citas (filtramos por fecha en el cliente y completamos nombres) */
  getAgendaDia(fechaISO: string): Observable<AgendaDia> {
    return this.http.get<any[]>(`${this.baseUrl}/citas`, { params: { date: fechaISO } }).pipe(
      map(rows => {
        const items = (rows ?? [])
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
    const payload = {
      pacienteId: Number(body.pacienteId),
      usuarioId: 1, // ajusta si tienes usuario real
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
   * PATCH /citas/:id  (editar hora/motivo/notas y/o mover de día y/o cambiar paciente)
   * IMPORTANTE:
   * - Ahora SIEMPRE mandamos 'fecha' Y 'hora' para evitar que la BD conserve la hora vieja.
   * - Si el usuario selecciona otro paciente, enviamos pacienteId (number).
   */
  actualizarCita(
    id: string,
    fechaISO: string,
    payload: Partial<Pick<CitaItem, 'hora'|'paciente'|'motivo'|'notas'>> & { pacienteId?: string }
  ): Observable<CitaItem> {
    const horaFinal = this.normHora(payload.hora ?? '');
    const patch: any = {
      // siempre mandamos estos dos:
      fecha: this.toBackendDate(fechaISO, horaFinal || payload.hora),
      hora: horaFinal || this.normHora(payload.hora),
    };

    if (payload.motivo !== undefined) patch.motivo = payload.motivo;
    if (payload.notas  !== undefined) patch.notas  = payload.notas;
    if (payload.pacienteId)           patch.pacienteId = Number(payload.pacienteId);

    return this.http.patch<any>(`${this.baseUrl}/citas/${id}`, patch).pipe(
      map(this.mapRowToItem),
      switchMap(item => {
        // Si cambiamos de paciente o no viene nombre, lo traemos
        const debeCargarNombre =
          !!payload.pacienteId || !item.paciente;
        return debeCargarNombre
          ? this.fetchPacienteNombre(item?.pacienteId ?? '').pipe(
              map(name => ({ ...item, paciente: name }))
            )
          : of(item);
      })
    );
  }

  /** DELETE /citas/:id */
  eliminarCita(_fechaISO: string, id: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/citas/${id}`);
  }

  // Mock OFF
  clearMock(): void { /* no-op */ }
}
