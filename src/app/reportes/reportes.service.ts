// src/app/reportes/reportes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, forkJoin } from 'rxjs';

import { PacientesService, Paciente } from '../pacientes/pacientes.service';
import { AgendaService, CitaItem, AgendaDia } from '../agenda/agenda.service';
import { HistoriaClinicaService, CitaConFecha } from '../historia-clinica/historia-clinica.service';

/** ================== Tipos públicos ================== */
export type ReporteTipo = 'PACIENTES' | 'CITAS' | 'CLINICOS';
export type SubtipoPacientes = 'GENERAL' | 'INDIVIDUAL';
export type SubtipoCitas = 'DIARIO' | 'SEMANAL' | 'MENSUAL';
export type SubtipoClinicos = 'HISTORIAL_INDIVIDUAL';

export type EstadoCita = 'TODAS' | 'NUEVA' | 'PENDIENTE' | 'CONFIRMADA' | 'FINALIZADA' | 'CANCELADA';

export interface ReporteFiltro {
  tipo: ReporteTipo;
  subtipo?: string;
  desde?: string;        // yyyy-MM-dd
  hasta?: string;        // yyyy-MM-dd (ignorado en MENSUAL)
  estado?: EstadoCita;   // para Citas
  pacienteId?: string;   // para Clínicos (individual) o Pacientes(INDIVIDUAL)
}

export interface ReporteResultado {
  titulo: string;
  columnas: string[];
  filas: any[];
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private pacSvc = inject(PacientesService);
  private agendaSvc = inject(AgendaService);
  private historiaSvc = inject(HistoriaClinicaService);

  /** Cambia a false cuando conectes el backend */
  private readonly useMock = true;
  private readonly baseUrl = 'http://localhost:3000';

  /** ================== API pública (HTTP REAL + MOCK) ================== */
  /**
   * Método genérico (compatible con tu componente actual).
   * Si usas backend real unificado, deja este endpoint:
   *   POST /reportes  { tipo, subtipo, ... }
   */
  generarReporte(filtro: ReporteFiltro): Observable<ReporteResultado> {
    if (!this.useMock) {
      // === HTTP REAL (endpoint unificado) ===
      return this.http.post<ReporteResultado>(`${this.baseUrl}/reportes`, filtro);
    }
    // === MOCK ===
    return this.mock_generarReporte(filtro).pipe(delay(100));
  }

  /** Métodos específicos por tipo/subtipo (útiles si separas endpoints en tu backend) */
  // ---------- PACIENTES ----------
  pacientesGeneral(): Observable<ReporteResultado> {
    if (!this.useMock) {
      // === HTTP REAL ===  POST /reportes/pacientes { subtipo: 'GENERAL' }
      return this.http.post<ReporteResultado>(`${this.baseUrl}/reportes/pacientes`, { subtipo: 'GENERAL' });
    }
    return this.mock_pacientes({ tipo: 'PACIENTES', subtipo: 'GENERAL' });
  }

  pacientesIndividual(pacienteId: string): Observable<ReporteResultado> {
    if (!this.useMock) {
      // === HTTP REAL ===  POST /reportes/pacientes { subtipo: 'INDIVIDUAL', pacienteId }
      return this.http.post<ReporteResultado>(`${this.baseUrl}/reportes/pacientes`, { subtipo: 'INDIVIDUAL', pacienteId });
    }
    return this.mock_pacientes({ tipo: 'PACIENTES', subtipo: 'INDIVIDUAL', pacienteId });
  }

  // ---------- CITAS ----------
  citasDiarias(fecha: string, estado: EstadoCita = 'TODAS'): Observable<ReporteResultado> {
    if (!this.useMock) {
      // === HTTP REAL ===  POST /reportes/citas { subtipo:'DIARIO', desde:fecha, hasta:fecha, estado }
      return this.http.post<ReporteResultado>(`${this.baseUrl}/reportes/citas`, { subtipo: 'DIARIO', desde: fecha, hasta: fecha, estado });
    }
    return this.mock_citas({ tipo: 'CITAS', subtipo: 'DIARIO', desde: fecha, hasta: fecha, estado });
  }

  citasSemanales(desde: string, hasta?: string, estado: EstadoCita = 'TODAS'): Observable<ReporteResultado> {
    if (!this.useMock) {
      // === HTTP REAL ===  POST /reportes/citas { subtipo:'SEMANAL', desde, hasta, estado }
      return this.http.post<ReporteResultado>(`${this.baseUrl}/reportes/citas`, { subtipo: 'SEMANAL', desde, hasta, estado });
    }
    return this.mock_citas({ tipo: 'CITAS', subtipo: 'SEMANAL', desde, hasta, estado });
  }

  citasMensuales(enMesDe: string, estado: EstadoCita = 'TODAS'): Observable<ReporteResultado> {
    if (!this.useMock) {
      // === HTTP REAL ===  POST /reportes/citas { subtipo:'MENSUAL', desde:enMesDe, estado }  // el backend ignora 'hasta'
      return this.http.post<ReporteResultado>(`${this.baseUrl}/reportes/citas`, { subtipo: 'MENSUAL', desde: enMesDe, estado });
    }
    return this.mock_citas({ tipo: 'CITAS', subtipo: 'MENSUAL', desde: enMesDe, estado });
  }

  // ---------- CLÍNICOS ----------
  clinicoHistorialIndividual(pacienteId: string): Observable<ReporteResultado> {
    if (!this.useMock) {
      // === HTTP REAL ===  POST /reportes/clinicos/historial { pacienteId }
      return this.http.post<ReporteResultado>(`${this.baseUrl}/reportes/clinicos/historial`, { pacienteId });
    }
    return this.mock_clinicos({ tipo: 'CLINICOS', subtipo: 'HISTORIAL_INDIVIDUAL', pacienteId });
  }

  /** ================== MOCK (reutiliza datos reales de otros módulos) ================== */
  private mock_generarReporte(filtro: ReporteFiltro): Observable<ReporteResultado> {
    switch (filtro.tipo) {
      case 'PACIENTES':
        return this.mock_pacientes(filtro as ReporteFiltro & { subtipo: SubtipoPacientes });
      case 'CITAS':
        return this.mock_citas(filtro as ReporteFiltro & { subtipo: SubtipoCitas, estado?: EstadoCita });
      case 'CLINICOS':
        return this.mock_clinicos(filtro as ReporteFiltro & { subtipo: SubtipoClinicos });
      default:
        return of({ titulo: 'Reporte sin tipo', columnas: [], filas: [] });
    }
  }

  /** ================== Helpers de fecha ================== */
  private pad(n: number) { return String(n).padStart(2, '0'); }
  private fromYMD(s?: string): Date {
    if (!s) return new Date();
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }
  /** dd-MM-yyyy (clave que usa AgendaService.getAgendaDia) */
  private toAgendaKey(d: Date): string {
    return `${this.pad(d.getDate())}-${this.pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  }
  /** yyyy-MM-dd -> dd-MM-yyyy */
  private formatYMDToDMY(ymd?: string): string {
    if (!ymd) return '—';
    const [y, m, d] = ymd.split('-');
    return `${this.pad(+d)}-${this.pad(+m)}-${y}`;
  }
  private addDays(d: Date, days: number) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  }
  private startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  private endOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  /** ================== MOCK: PACIENTES ================== */
  private mock_pacientes(f: ReporteFiltro & { subtipo: SubtipoPacientes }): Observable<ReporteResultado> {
    const columnas = [
      'ID','Nombre','Apellidos','Teléfono','Email','Dirección','Estado',
      'DPI','Alergias','Fecha Nacimiento','Creado','Actualizado'
    ];

    if (f.subtipo === 'INDIVIDUAL') {
      if (!f.pacienteId) return of({ titulo: 'Reporte Individual de Paciente', columnas: [], filas: [] });
      return this.pacSvc.getById(f.pacienteId).pipe(map((p: Paciente | null) => {
        if (!p) return { titulo: 'Paciente no encontrado', columnas: [], filas: [] };
        const fila = {
          ID: p.id, Nombre: p.nombres, Apellidos: p.apellidos,
          Teléfono: p.telefono ?? '—', Email: p.email ?? '—', Dirección: p.direccion ?? '—',
          Estado: p.estado, DPI: p.dpi ?? '—', Alergias: p.alergias ?? '—',
          'Fecha Nacimiento': p.fechaNacimiento ? this.formatYMDToDMY(p.fechaNacimiento) : '—',
          'Creado': p.createdAt ? this.formatYMDToDMY(p.createdAt.slice(0,10)) : '—',
          'Actualizado': p.updatedAt ? this.formatYMDToDMY(p.updatedAt.slice(0,10)) : '—',
        };
        return { titulo: `Reporte Individual – ${p.nombres} ${p.apellidos}`, columnas, filas: [fila] };
      }));
    }

    return this.pacSvc.list().pipe(map((arr: Paciente[]) => {
      const filas = arr.map(p => ({
        ID: p.id, Nombre: p.nombres, Apellidos: p.apellidos,
        Teléfono: p.telefono ?? '—', Email: p.email ?? '—', Dirección: p.direccion ?? '—',
        Estado: p.estado, DPI: p.dpi ?? '—', Alergias: p.alergias ?? '—',
        'Fecha Nacimiento': p.fechaNacimiento ? this.formatYMDToDMY(p.fechaNacimiento) : '—',
        'Creado': p.createdAt ? this.formatYMDToDMY(p.createdAt.slice(0,10)) : '—',
        'Actualizado': p.updatedAt ? this.formatYMDToDMY(p.updatedAt.slice(0,10)) : '—',
      }));
      return { titulo: 'Reporte General de Pacientes', columnas, filas };
    }));
  }

  /** ================== MOCK: CITAS ================== */
  private mock_citas(f: ReporteFiltro & { subtipo: SubtipoCitas, estado?: EstadoCita }): Observable<ReporteResultado> {
    const columnas = ['Fecha', 'Hora', 'Paciente', 'Motivo', 'Estado'];

    // 1) Determinar rango
    let dDesde = this.fromYMD(f.desde);
    let dHasta: Date;

    if (f.subtipo === 'DIARIO') {
      dHasta = dDesde;
    } else if (f.subtipo === 'SEMANAL') {
      dHasta = f.hasta ? this.fromYMD(f.hasta) : this.addDays(dDesde, 6);
    } else {
      // MENSUAL: ignora 'hasta' y usa 1..último del mes de "desde"
      dDesde = this.startOfMonth(dDesde);
      dHasta = this.endOfMonth(dDesde);
    }

    // 2) Lista de días del rango
    const days: Date[] = [];
    for (let d = new Date(dDesde); d <= dHasta; d = this.addDays(d, 1)) days.push(new Date(d));

    // 3) Pedir agenda por día y aplicar filtro de estado
    const estadoFiltro: EstadoCita = f.estado ?? 'TODAS';

    const reqs = days.map(d => {
      const key = this.toAgendaKey(d); // dd-MM-yyyy
      return this.agendaSvc.getAgendaDia(key).pipe(
        map((res: AgendaDia) => {
          const items = res?.items ?? [];
          const filtradas = items.filter(c => {
            if (estadoFiltro === 'TODAS') return true;
            return (c.status as EstadoCita) === estadoFiltro;
          });
          return filtradas.map((c: CitaItem) => ({
            Fecha: key,
            Hora: c.hora,
            Paciente: c.paciente ?? '—',
            Motivo: c.motivo ?? '—',
            Estado: c.status ?? '—'
          }));
        })
      );
    });

    // 4) Consolidar, ordenar y armar título
    return forkJoin(reqs).pipe(
      map(listas => listas.flat()),
      map(rows => {
        rows.sort((a, b) => {
          const [da,ma,ya] = a.Fecha.split('-').map(Number);
          const [db,mb,yb] = b.Fecha.split('-').map(Number);
          const [ha,na] = (a.Hora || '00:00').split(':').map(Number);
          const [hb,nb] = (b.Hora || '00:00').split(':').map(Number);
          const ta = new Date(ya,(ma||1)-1,da||1,ha||0,na||0).getTime();
          const tb = new Date(yb,(mb||1)-1,db||1,hb||0,nb||0).getTime();
          return ta - tb;
        });

        let titulo = '';
        if (f.subtipo === 'DIARIO') {
          titulo = `Citas del ${this.formatYMDToDMY(f.desde)}`;
        } else if (f.subtipo === 'SEMANAL') {
          const hastaDMY = this.formatYMDToDMY(`${dHasta.getFullYear()}-${this.pad(dHasta.getMonth()+1)}-${this.pad(dHasta.getDate())}`);
          titulo = `Citas – Semana del ${this.formatYMDToDMY(f.desde)} al ${hastaDMY}`;
        } else {
          const desdeDMY = `${this.pad(dDesde.getDate())}-${this.pad(dDesde.getMonth()+1)}-${dDesde.getFullYear()}`;
          const hastaDMY = `${this.pad(dHasta.getDate())}-${this.pad(dHasta.getMonth()+1)}-${dHasta.getFullYear()}`;
          titulo = `Citas del mes ${desdeDMY} a ${hastaDMY}`;
        }

        if (estadoFiltro && estadoFiltro !== 'TODAS') {
          titulo += ` · Estado: ${estadoFiltro}`;
        }

        return { titulo, columnas, filas: rows };
      })
    );
  }

  /** ================== MOCK: CLÍNICOS ================== */
  private mock_clinicos(f: ReporteFiltro & { subtipo: SubtipoClinicos }): Observable<ReporteResultado> {
    if (!f.pacienteId) {
      return of({ titulo: 'Selecciona un paciente', columnas: [], filas: [] });
    }

    return this.historiaSvc.getHistoriaClinica(f.pacienteId).pipe(
      map(hist => {
        if (!hist || !hist.citas?.length) {
          return { titulo: 'Sin historial clínico registrado', columnas: [], filas: [] };
        }

        const filas = hist.citas
          .slice()
          .sort((a, b) => {
            const [da, ma, ya] = (a.fechaISO || '').split('-').map(Number);
            const [db, mb, yb] = (b.fechaISO || '').split('-').map(Number);
            const [ha, na] = (a.hora || '00:00').split(':').map(Number);
            const [hb, nb] = (b.hora || '00:00').split(':').map(Number);
            return new Date(ya, ma - 1, da, ha, na).getTime() - new Date(yb, mb - 1, db, hb, nb).getTime();
          })
          .map((c: CitaConFecha) => ({
            Fecha: c.fechaISO,   // ya viene dd-MM-yyyy desde el servicio
            Hora: c.hora,
            Motivo: c.motivo ?? '—',
            Estado: c.status ?? '—',
            Notas: c.notas ?? '—',
          }));

        const columnas = ['Fecha', 'Hora', 'Motivo', 'Estado', 'Notas'];
        const titulo = `Historial Clínico – ${hist.paciente.nombres} ${hist.paciente.apellidos}`;
        return { titulo, columnas, filas };
      })
    );
  }
}
