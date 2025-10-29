// src/app/historia-clinica/historia-clinica.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { CitaItem } from '../agenda/agenda.service';
import { Paciente } from '../pacientes/pacientes.service';
import { AuthService } from '../core/auth.service';

export type CitaConFecha = CitaItem & { fechaISO: string };

export interface HistoriaClinica {
  paciente: Paciente;
  citas: CitaConFecha[];
}

@Injectable({ providedIn: 'root' })
export class HistoriaClinicaService {
  private http = inject(HttpClient);
  private authService = inject(AuthService); // Inyectamos el servicio de autenticación
  private readonly baseUrl = 'http://localhost:3000';
  //private readonly baseUrl = 'https://odonto-clinic.onrender.com';

  // ===== Helpers de fecha / orden =====
  private toISO_ddMMyyyy(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  private normHora(h: string | null | undefined): string {
    return (h ?? '').toString().slice(0, 5);
  }
  private compareFechaHora(f1: string, h1: string, f2: string, h2: string) {
    const [d1, m1, y1] = f1.split('-').map(Number);
    const [d2, m2, y2] = f2.split('-').map(Number);
    const [hh1, mm1] = (h1 ?? '00:00').split(':').map(Number);
    const [hh2, mm2] = (h2 ?? '00:00').split(':').map(Number);
    const A = new Date(y1, (m1 || 1) - 1, d1 || 1, hh1 || 0, mm1 || 0).getTime();
    const B = new Date(y2, (m2 || 1) - 1, d2 || 1, hh2 || 0, mm2 || 0).getTime();
    return A - B;
  }
  private isNumericId(v: string) { return /^\d+$/.test((v ?? '').trim()); }

  // ===== Mapeo Paciente (normaliza campos del backend) =====
  private mapPaciente = (row: any): Paciente => {
    // Tomamos el nombre del backend (creadoEn/actualizadoEn) si no vienen como createdAt/updatedAt
    const createdAt = row?.createdAt ?? row?.creadoEn ?? row?.creado_at ?? null;
    const updatedAt = row?.updatedAt ?? row?.actualizadoEn ?? row?.updated_at ?? null;

    return {
      id: String(row?.id ?? ''),
      nombres: row?.nombres ?? '',
      apellidos: row?.apellidos ?? '',
      telefono: row?.telefono ?? '',
      email: row?.email ?? null,
      direccion: row?.direccion ?? null,
      estado: (row?.estado ?? 'ACTIVO').toString().toUpperCase() === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
      alergias: row?.alergias ?? null,
      // Si el backend trae fechaNacimiento ISO, la dejamos tal cual; si viniera dd-MM-yyyy también lo aceptamos
      fechaNacimiento: row?.fechaNacimiento ?? null,
      dpi: row?.dpi ?? null,
      creadoPorId: row?.creadoPorId ?? null, // Aseguramos el mapeo del campo creadoPorId
      createdAt: createdAt ?? undefined,
      updatedAt: updatedAt ?? undefined,
    };
  };

  /** Acepta number|string. Si no es numérico (mock), lo resuelve buscando en /pacientes */
  private resolvePacienteId(pacienteIdOrQuery: number | string): Observable<number> {
    const raw = String(pacienteIdOrQuery ?? '').trim();

    if (this.isNumericId(raw)) return of(Number(raw));

    // Intento 1: backend con ?search=
    return this.http.get<any[]>(`${this.baseUrl}/pacientes`, { params: { search: raw } }).pipe(
      switchMap(list => {
        const hit = Array.isArray(list) && list.length ? list[0] : null;
        if (hit?.id != null && /^\d+$/.test(String(hit.id))) return of(Number(hit.id));

        // Fallback: traer todos y filtrar localmente
        return this.http.get<any[]>(`${this.baseUrl}/pacientes`).pipe(
          map(all => {
            const q = raw.toLowerCase();
            const h = (all ?? []).find((p: any) =>
              `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q) ||
              (p.dpi ?? '').toLowerCase().includes(q) ||
              (p.telefono ?? '').toLowerCase().includes(q) ||
              (p.email ?? '').toLowerCase().includes(q)
            );
            if (!h || !/^\d+$/.test(String(h.id))) throw new Error('PACIENTE_NO_ENCONTRADO');
            return Number(h.id);
          })
        );
      })
    );
  }

  // =============== API Pública ===============
  /** Carga paciente + citas reales para ese paciente (mantiene tu diseño) */
  getHistoriaClinica(pacienteId: number | string): Observable<HistoriaClinica> {
    const currentUser = this.authService.getCurrentUser(); // Obtenemos el usuario logueado
    if (!currentUser) {
      throw new Error('Usuario no logueado');
    }

    return this.resolvePacienteId(pacienteId).pipe(
      switchMap(idNum => {
        const paciente$ = this.http
          .get<any>(`${this.baseUrl}/pacientes/${idNum}`)
          .pipe(
            map(this.mapPaciente),
            map(paciente => {
              if (paciente.creadoPorId !== currentUser.id) {
                throw new Error('PACIENTE_NO_AUTORIZADO');
              }
              return paciente;
            })
          );

        const citas$ = this.http
          .get<any[]>(`${this.baseUrl}/citas`, { params: { pacienteId: String(idNum) } })
          .pipe(
            switchMap(rows => {
              if (!Array.isArray(rows) || rows.length === 0) {
                // Si el backend ignora ?pacienteId, traemos todas y filtramos acá
                return this.http.get<any[]>(`${this.baseUrl}/citas`).pipe(
                  map(all => (all ?? []).filter(r => Number(r?.pacienteId) === idNum))
                );
              }
              return of(rows.filter(r => Number(r?.pacienteId) === idNum));
            })
          );

        return forkJoin({ paciente: paciente$, citasRows: citas$ });
      }),
      map(({ paciente, citasRows }) => {
        const citas: CitaConFecha[] = (citasRows ?? []).map((r: any) => {
          const fecha = new Date(r?.fecha);
          const fechaISO = isNaN(fecha.getTime()) ? '' : this.toISO_ddMMyyyy(fecha);
          return {
            id: String(r?.id ?? ''),
            hora: this.normHora(r?.hora),
            pacienteId: r?.pacienteId != null ? String(r.pacienteId) : undefined,
            paciente: undefined,
            motivo: r?.motivo ?? undefined,
            status: r?.estado,
            notas: r?.notas ?? undefined,
            fechaISO,
          };
        });

        citas.sort((a, b) => this.compareFechaHora(a.fechaISO, a.hora, b.fechaISO, b.hora));
        return { paciente, citas };
      }),
      timeout(10000), // evita spinner infinito si algo cuelga
      catchError(err => {
        console.error('[HistoriaClinica] Error:', err);
        // Devuelve estructura vacía para no romper la UI
        return of({ paciente: {} as Paciente, citas: [] });
      })
    );
  }

  /** Busca pacientes (usa ?search y si no, filtra localmente) — mapeando fechas */
  buscarPacientes(query: string): Observable<Paciente[]> {
    const currentUser = this.authService.getCurrentUser(); // Obtenemos el usuario logueado
    if (!currentUser) {
      throw new Error('Usuario no logueado');
    }

    const q = (query ?? '').trim();
    if (!q) return of([]);

    return this.http.get<any[]>(`${this.baseUrl}/pacientes`, { params: { search: q } }).pipe(
      switchMap(list => {
        if (Array.isArray(list) && list.length) {
          return of(list
            .map(this.mapPaciente)
            .filter(paciente => paciente.creadoPorId === currentUser.id) // Filtramos por creadoPorId
          );
        }
        // Fallback: traer todos y filtrar local
        return this.http.get<any[]>(`${this.baseUrl}/pacientes`).pipe(
          map(all => {
            const ql = q.toLowerCase();
            return (all ?? [])
              .filter((p: any) =>
                `${p.nombres} ${p.apellidos}`.toLowerCase().includes(ql) ||
                (p.telefono ?? '').toLowerCase().includes(ql) ||
                (p.email ?? '').toLowerCase().includes(ql) ||
                (p.dpi ?? '').toLowerCase().includes(ql)
              )
              .map(this.mapPaciente)
              .filter(paciente => paciente.creadoPorId === currentUser.id) // Filtramos por creadoPorId
              .slice(0, 20);
          })
        );
      }),
      catchError(() => of([]))
    );
  }
}
