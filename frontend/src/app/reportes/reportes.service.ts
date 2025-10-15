import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, forkJoin } from 'rxjs';
import { PacientesService, Paciente } from '../pacientes/pacientes.service';
import { AgendaService, CitaItem, AgendaDia } from '../agenda/agenda.service';

export type ReporteTipo = 'PACIENTES' | 'CITAS' | 'CLINICOS';
export type SubtipoPacientes = 'GENERAL' | 'INDIVIDUAL';
export type SubtipoCitas = 'DIARIO' | 'SEMANAL' | 'MENSUAL';
export type SubtipoClinicos = 'HISTORIAL_INDIVIDUAL' | 'TRATAMIENTOS_PERIODO';

export type EstadoCita = 'TODAS' | 'NUEVA' | 'PENDIENTE' | 'CONFIRMADA' | 'FINALIZADA' | 'CANCELADA';

export interface ReporteFiltro {
  tipo: ReporteTipo;
  subtipo?: string;
  desde?: string;        // yyyy-MM-dd (viene del input date)
  hasta?: string;        // yyyy-MM-dd (se ignora cuando subtipo === 'MENSUAL')
  estado?: EstadoCita;   // filtro para Citas
  pacienteId?: string;
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

  /** Cambia a false cuando conectes el backend */
  private readonly useMock = true;
  private readonly baseUrl = 'http://localhost:3000';

  // =================== API pública ===================
  generarReporte(filtro: ReporteFiltro): Observable<ReporteResultado> {
    if (!this.useMock) {
      return this.http.post<ReporteResultado>(`${this.baseUrl}/reportes`, filtro);
    }
    return this.mock_generarReporte(filtro).pipe(delay(100));
  }

  // =================== MOCK (usa datos reales de otros módulos) ===================
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

  // ===== Helpers de fecha =====
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

  // ---------- PACIENTES ----------
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

  // ---------- CITAS ----------
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
            Estado: c.status ?? '—',
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
          const desdeDMY = this.formatYMDToDMY(f.desde);
          const hastaDMY = this.formatYMDToDMY(`${dHasta.getFullYear()}-${this.pad(dHasta.getMonth()+1)}-${this.pad(dHasta.getDate())}`);
          titulo = `Citas – Semana del ${desdeDMY} al ${hastaDMY}`;
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

  // ---------- CLÍNICOS (placeholder simple, puedes conectar a HistoriaClinicaService) ----------
  private mock_clinicos(_: ReporteFiltro & { subtipo: SubtipoClinicos }): Observable<ReporteResultado> {
    return of({
      titulo: 'Historial Clínico (ejemplo)',
      columnas: ['Fecha', 'Procedimiento', 'Notas', 'Estado'],
      filas: [{ Fecha: '10-10-2025', Procedimiento: 'Limpieza', Notas: 'OK', Estado: 'FINALIZADA' }],
    });
  }
}
