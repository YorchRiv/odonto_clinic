import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';
import { PacientesService, Paciente } from '../pacientes/pacientes.service';

export type ReporteTipo = 'PACIENTES' | 'CITAS' | 'CLINICOS';
export type SubtipoPacientes = 'GENERAL' | 'INDIVIDUAL';
export type SubtipoCitas = 'DIARIO' | 'SEMANAL' | 'POR_ESTADO' | 'POR_PROCEDIMIENTO';
export type SubtipoClinicos = 'HISTORIAL_INDIVIDUAL' | 'TRATAMIENTOS_PERIODO';

export interface ReporteFiltro {
  tipo: ReporteTipo;
  subtipo?: string;
  desde?: string;        // yyyy-MM-dd
  hasta?: string;        // yyyy-MM-dd
  estado?: string;
  procedimiento?: string;
  pacienteId?: string;   // para INDIVIDUAL / HISTORIAL_INDIVIDUAL
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

  /** Cambia a false cuando conectes el backend */
  private readonly useMock = true;
  private readonly baseUrl = 'http://localhost:3000';

  // =================== API pública ===================
  generarReporte(filtro: ReporteFiltro): Observable<ReporteResultado> {
    if (!this.useMock) {
      return this.http.post<ReporteResultado>(`${this.baseUrl}/reportes`, filtro);
    }
    return this.mock_generarReporte(filtro).pipe(delay(150));
  }

  // =================== MOCK (usa datos reales de otros módulos) ===================
  private mock_generarReporte(filtro: ReporteFiltro): Observable<ReporteResultado> {
    switch (filtro.tipo) {
      case 'PACIENTES':
        return this.mock_pacientes(filtro as ReporteFiltro & { subtipo: SubtipoPacientes });
      case 'CITAS':
        return this.mock_citas(filtro as ReporteFiltro & { subtipo: SubtipoCitas });
      case 'CLINICOS':
        return this.mock_clinicos(filtro as ReporteFiltro & { subtipo: SubtipoClinicos });
      default:
        return of({ titulo: 'Reporte sin tipo', columnas: [], filas: [] });
    }
  }

  // === Helpers de formato de fechas ===
  private pad(n: number) { return String(n).padStart(2, '0'); }

  /** Convierte ISO -> dd-MM-yyyy */
  private formatISOToDMY(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const dd = this.pad(d.getDate());
    const mm = this.pad(d.getMonth() + 1);
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

  /** Convierte yyyy-MM-dd -> dd-MM-yyyy */
  private formatYMDToDMY(ymd?: string | null): string {
    if (!ymd) return '—';
    const parts = ymd.split('-').map(p => p.trim());
    if (parts.length !== 3) return '—';
    const [y, m, d] = parts;
    if (!y || !m || !d) return '—';
    return `${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`;
  }

  // ---------- PACIENTES ----------
  private mock_pacientes(f: ReporteFiltro & { subtipo: SubtipoPacientes }): Observable<ReporteResultado> {
    const columnasComunes = [
      'ID','Nombre','Apellidos','Teléfono','Email','Dirección','Estado',
      'DPI','Alergias','Fecha Nacimiento','Creado','Actualizado'
    ];

    if (f.subtipo === 'INDIVIDUAL') {
      if (!f.pacienteId) {
        return of({ titulo: 'Reporte Individual de Paciente', columnas: [], filas: [] });
      }
      return this.pacSvc.getById(f.pacienteId).pipe(
        map((p: Paciente | null) => {
          if (!p) return { titulo: 'Paciente no encontrado', columnas: [], filas: [] };

          const fila = {
            ID: p.id,
            Nombre: p.nombres,
            Apellidos: p.apellidos,
            Teléfono: p.telefono ?? '—',
            Email: p.email ?? '—',
            Dirección: p.direccion ?? '—',
            Estado: p.estado,
            DPI: p.dpi ?? '—',
            Alergias: p.alergias ?? '—',
            'Fecha Nacimiento': this.formatYMDToDMY(p.fechaNacimiento),
            'Creado': this.formatISOToDMY(p.createdAt),
            'Actualizado': this.formatISOToDMY(p.updatedAt),
          };

          return {
            titulo: `Reporte Individual – ${p.nombres} ${p.apellidos}`,
            columnas: columnasComunes,
            filas: [fila],
          };
        })
      );
    }

    // GENERAL (mismas columnas que individual)
    return this.pacSvc.list().pipe(
      map((arr: Paciente[]) => {
        const filas = arr.map(p => ({
          ID: p.id,
          Nombre: p.nombres,
          Apellidos: p.apellidos,
          Teléfono: p.telefono ?? '—',
          Email: p.email ?? '—',
          Dirección: p.direccion ?? '—',
          Estado: p.estado,
          DPI: p.dpi ?? '—',
          Alergias: p.alergias ?? '—',
          'Fecha Nacimiento': this.formatYMDToDMY(p.fechaNacimiento),
          'Creado': this.formatISOToDMY(p.createdAt),
          'Actualizado': this.formatISOToDMY(p.updatedAt),
        }));

        return {
          titulo: 'Reporte General de Pacientes',
          columnas: columnasComunes,
          filas,
        };
      })
    );
  }

  // ---------- CITAS (placeholder: ajusta cuando conectes AgendaService) ----------
  private mock_citas(f: ReporteFiltro & { subtipo: SubtipoCitas }): Observable<ReporteResultado> {
    const columnas = ['Fecha', 'Hora', 'Paciente', 'Motivo', 'Estado'];
    const filas = [
      { Fecha: this.formatYMDToDMY(f.desde ?? '2025-10-14'), Hora: '09:00', Paciente: '—', Motivo: '—', Estado: f.estado ?? 'CONFIRMADA' },
      { Fecha: this.formatYMDToDMY(f.hasta ?? '2025-10-15'), Hora: '11:00', Paciente: '—', Motivo: '—', Estado: 'FINALIZADA' },
    ];
    const titulo =
      f.subtipo === 'DIARIO' ? `Citas del ${this.formatYMDToDMY(f.desde)}` :
      f.subtipo === 'SEMANAL' ? `Citas – Semana iniciando ${this.formatYMDToDMY(f.desde)}` :
      f.subtipo === 'POR_ESTADO' ? `Citas por estado (${f.estado ?? 'TODAS'})` :
      'Citas por procedimiento';
    return of({ titulo, columnas, filas });
  }

  // ---------- CLÍNICOS (placeholder: ajusta cuando conectes HistoriaClinicaService) ----------
  private mock_clinicos(f: ReporteFiltro & { subtipo: SubtipoClinicos }): Observable<ReporteResultado> {
    if (f.subtipo === 'HISTORIAL_INDIVIDUAL') {
      return of({
        titulo: 'Historial Clínico Individual',
        columnas: ['Fecha', 'Procedimiento', 'Notas', 'Estado'],
        filas: [
          { Fecha: this.formatYMDToDMY('2025-10-10'), Procedimiento: 'Limpieza', Notas: 'Sin complicaciones', Estado: 'FINALIZADA' },
        ],
      });
    }
    return of({
      titulo: 'Tratamientos por Período',
      columnas: ['Fecha', 'Paciente', 'Procedimiento', 'Estado'],
      filas: [
        { Fecha: this.formatYMDToDMY(f.desde ?? '2025-10-01'), Paciente: '—', Procedimiento: 'Endodoncia', Estado: 'FINALIZADA' },
      ],
    });
  }
}
