import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, delay } from 'rxjs';
import { CitaItem } from '../agenda/agenda.service';
import { Paciente } from '../pacientes/pacientes.service';

export interface HistoriaClinica {
  paciente: Paciente;
  citas: CitaItem[];
}

@Injectable({
  providedIn: 'root'
})
export class HistoriaClinicaService {
  private http = inject(HttpClient);
  private readonly useMock = true;
  private readonly baseUrl = 'http://localhost:3000';

  // =============== API Pública ===============
  getHistoriaClinica(pacienteId: string): Observable<HistoriaClinica> {
    if (this.useMock) return this.mock_getHistoriaClinica(pacienteId).pipe(delay(100));
    return this.http.get<HistoriaClinica>(`${this.baseUrl}/historia-clinica/${pacienteId}`);
  }

  buscarPacientes(query: string): Observable<Paciente[]> {
    if (this.useMock) return this.mock_buscarPacientes(query).pipe(delay(80));
    return this.http.get<Paciente[]>(`${this.baseUrl}/pacientes`, { 
      params: { search: query } 
    });
  }

  // ============================= MOCK ============================
  private mock_buscarPacientes(query: string): Observable<Paciente[]> {
    // Leer pacientes existentes del localStorage
    const pacientesStorage = localStorage.getItem('dentalpro_pacientes_v1');
    const pacientes: Paciente[] = pacientesStorage ? JSON.parse(pacientesStorage) : [];
    
    if (!query.trim()) return of([]);
    
    const q = query.toLowerCase().trim();
    const resultados = pacientes.filter(p => 
      `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q) ||
      (p.telefono ?? '').toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.dpi ?? '').toLowerCase().includes(q)
    );
    
    return of(resultados.slice(0, 10)); // Limitar a 10 resultados
  }

  private mock_getHistoriaClinica(pacienteId: string): Observable<HistoriaClinica> {
    // Leer paciente
    const pacientesStorage = localStorage.getItem('dentalpro_pacientes_v1');
    const pacientes: Paciente[] = pacientesStorage ? JSON.parse(pacientesStorage) : [];
    const paciente = pacientes.find(p => p.id === pacienteId);
    
    if (!paciente) {
      return throwError(() => new Error('PACIENTE_NO_ENCONTRADO'));
    }

    // Leer todas las citas del paciente
    const agendaStorage = localStorage.getItem('dentalpro_agenda_v1');
    const agenda: Record<string, CitaItem[]> = agendaStorage ? JSON.parse(agendaStorage) : {};
    
    let todasLasCitas: CitaItem[] = [];
    
    // Recorrer todas las fechas y buscar citas del paciente
    Object.keys(agenda).forEach(fecha => {
      const citasDelDia = agenda[fecha] || [];
      const citasDelPaciente = citasDelDia.filter(cita => 
        cita.pacienteId === pacienteId || cita.paciente === `${paciente.nombres} ${paciente.apellidos}`
      );
      todasLasCitas = [...todasLasCitas, ...citasDelPaciente];
    });

    // Ordenar citas por fecha (más reciente primero)
    todasLasCitas.sort((a, b) => {
      // Para simplificar, ordenar por hora si no tenemos fecha específica
      // En un caso real, deberíamos tener la fecha en cada cita
      return b.hora.localeCompare(a.hora);
    });

    return of({
      paciente,
      citas: todasLasCitas
    });
  }
}