import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoriaClinicaService } from './historia-clinica.service';
import { Paciente } from '../pacientes/pacientes.service';
import { CitaItem, CitaStatus } from '../agenda/agenda.service';

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historia-clinica.component.html',
  styleUrls: ['./historia-clinica.component.css']
})
export class HistoriaClinicaComponent implements OnInit {
  private historiaSvc = inject(HistoriaClinicaService);

  // Estados
  buscando = signal(false);
  cargandoHistoria = signal(false);
  error = signal<string>('');

  // Búsqueda
  searchQuery = signal('');
  pacientesEncontrados = signal<Paciente[]>([]);
  mostrandoResultados = signal(false);

  // Datos seleccionados
  pacienteSeleccionado = signal<Paciente | null>(null);
  historiaClinica = signal<{ paciente: Paciente; citas: CitaItem[] } | null>(null);

  ngOnInit(): void {}

  // ===== BÚSQUEDA DE PACIENTES =====
  onSearchChange(query: string) {
    this.searchQuery.set(query);
    
    if (!query.trim()) {
      this.pacientesEncontrados.set([]);
      this.mostrandoResultados.set(false);
      return;
    }

    this.buscando.set(true);
    this.historiaSvc.buscarPacientes(query).subscribe({
      next: (pacientes) => {
        this.pacientesEncontrados.set(pacientes);
        this.mostrandoResultados.set(true);
        this.buscando.set(false);
      },
      error: () => {
        this.pacientesEncontrados.set([]);
        this.buscando.set(false);
      }
    });
  }

  onSearchBlur() {
    // Ocultar resultados después de un pequeño delay
    setTimeout(() => {
      this.mostrandoResultados.set(false);
    }, 150);
  }

  seleccionarPaciente(paciente: Paciente) {
    this.pacienteSeleccionado.set(paciente);
    this.searchQuery.set('');
    this.pacientesEncontrados.set([]);
    this.mostrandoResultados.set(false);
    this.error.set('');
    
    this.cargarHistoriaClinica(paciente.id);
  }

  // ===== CARGA DE HISTORIA CLÍNICA =====
  private cargarHistoriaClinica(pacienteId: string) {
    this.cargandoHistoria.set(true);
    this.historiaSvc.getHistoriaClinica(pacienteId).subscribe({
      next: (historia) => {
        this.historiaClinica.set(historia);
        this.cargandoHistoria.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar la historia clínica');
        this.cargandoHistoria.set(false);
        console.error('Error:', err);
      }
    });
  }

  // ===== HELPERS UI =====
  limpiarBusqueda() {
    this.searchQuery.set('');
    this.pacientesEncontrados.set([]);
    this.mostrandoResultados.set(false);
    this.pacienteSeleccionado.set(null);
    this.historiaClinica.set(null);
    this.error.set('');
  }

  formatFecha(fechaStr?: string | null): string {
    if (!fechaStr) return 'No registrada';
    
    try {
      // Para fechas en formato ISO (de pacientes)
      if (fechaStr.includes('-')) {
        // Si es formato yyyy-MM-dd (de pacientes)
        if (fechaStr.includes('T')) {
          // Formato ISO completo
          const fecha = new Date(fechaStr);
          return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        } else {
          // Formato yyyy-MM-dd simple
          const [year, month, day] = fechaStr.split('-');
          return `${day}/${month}/${year}`;
        }
      }
      
      // Para fechas en formato dd-MM-yyyy (de agenda)
      if (fechaStr.includes('-') && fechaStr.length === 10) {
        const [day, month, year] = fechaStr.split('-');
        return `${day}/${month}/${year}`;
      }
      
      return fechaStr;
    } catch {
      return fechaStr || 'No registrada';
    }
  }

  horaAMPM(hhmm: string): string {
    try {
      const [h, m] = hhmm.split(':').map(Number);
      const d = new Date(); 
      d.setHours(h, m, 0, 0);
      return d.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch {
      return hhmm;
    }
  }

  etiquetaStatus(s: CitaStatus): string {
    const map: Record<CitaStatus, string> = {
      CONFIRMADA: 'Confirmada',
      PENDIENTE: 'Pendiente',
      NUEVA: 'Nueva',
      FINALIZADA: 'Finalizada',
      CANCELADA: 'Cancelada',
      DISPONIBLE: 'Disponible'
    };
    return map[s] ?? s;
  }

  statusClass(s: CitaStatus): string {
    const map: Record<CitaStatus, string> = {
      CONFIRMADA: 'confirmada',
      PENDIENTE: 'pendiente',
      NUEVA: 'nueva',
      FINALIZADA: 'finalizada',
      CANCELADA: 'cancelada',
      DISPONIBLE: 'disponible'
    };
    return map[s] ?? 'pendiente';
  }

  initials(p: Paciente): string {
    const a = (p.nombres || ' ')[0] ?? '';
    const b = (p.apellidos || ' ')[0] ?? '';
    return `${a}${b}`.toUpperCase();
  }

  trackByPacienteId = (_: number, paciente: Paciente) => paciente.id;
  trackByCitaId = (_: number, cita: CitaItem) => cita.id;
}