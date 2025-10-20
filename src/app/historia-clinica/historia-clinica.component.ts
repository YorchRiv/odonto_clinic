import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoriaClinicaService, CitaConFecha, HistoriaClinica } from './historia-clinica.service';
import { Paciente } from '../pacientes/pacientes.service';
import { CitaStatus } from '../agenda/agenda.service';

type GrupoCitas = { fechaISO: string; items: CitaConFecha[]; open: boolean };

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
  historiaClinica = signal<HistoriaClinica | null>(null);

  // UI: filtros y orden
  filtroEstado = signal<string>(''); // '', 'NUEVA', 'CONFIRMADA', etc.
  ordenDesc = signal<boolean>(true);  // true => recientes primero

  // Estado de colapso por fecha
  openByDate = signal<Record<string, boolean>>({});

  // Notas expandidas por cita
  expandedNotes = new Set<string>();
  toggleNote(id: string) {
    if (this.expandedNotes.has(id)) this.expandedNotes.delete(id);
    else this.expandedNotes.add(id);
  }
  isExpanded(id: string) { return this.expandedNotes.has(id); }

  // Agrupación por fecha con filtro/orden aplicados
  grupos = computed<GrupoCitas[]>(() => {
    const hc = this.historiaClinica();
    if (!hc) return [];

    // Filtrar por estado (si aplica)
    let citas = hc.citas;
    if (this.filtroEstado()) citas = citas.filter(c => c.status === this.filtroEstado());

    // Orden global por fecha+hora
    const toMillis = (c: CitaConFecha) => {
      const [d, m, y] = c.fechaISO.split('-').map(Number);
      const [hh, mm] = (c.hora ?? '00:00').split(':').map(Number);
      return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).getTime();
    };
    citas = citas.slice().sort((a, b) => this.ordenDesc() ? toMillis(b) - toMillis(a) : toMillis(a) - toMillis(b));

    // Agrupar por fecha
    const map = new Map<string, CitaConFecha[]>();
    citas.forEach(c => {
      if (!map.has(c.fechaISO)) map.set(c.fechaISO, []);
      map.get(c.fechaISO)!.push(c);
    });

    // Orden de fechas
    const keys = Array.from(map.keys()).sort((f1, f2) => {
      const [d1,m1,y1] = f1.split('-').map(Number);
      const [d2,m2,y2] = f2.split('-').map(Number);
      const A = new Date(y1, (m1 || 1) - 1, d1 || 1).getTime();
      const B = new Date(y2, (m2 || 1) - 1, d2 || 1).getTime();
      return this.ordenDesc() ? B - A : A - B;
    });

    const openMap = this.openByDate();
    return keys.map(k => ({
      fechaISO: k,
      items: (map.get(k) ?? []).slice().sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? '')),
      // DEFAULT: plegado al cargar (false)
      open: openMap[k] ?? false,
    }));
  });

  ngOnInit(): void {}

  // ===== BÚSQUEDA =====
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
    setTimeout(() => this.mostrandoResultados.set(false), 150);
  }

  seleccionarPaciente(paciente: Paciente) {
    this.pacienteSeleccionado.set(paciente);
    this.searchQuery.set('');
    this.pacientesEncontrados.set([]);
    this.mostrandoResultados.set(false);
    this.error.set('');
    this.cargarHistoriaClinica(paciente.id);
  }

  private cargarHistoriaClinica(pacienteId: string) {
    this.cargandoHistoria.set(true);
    this.historiaSvc.getHistoriaClinica(pacienteId).subscribe({
      next: (historia) => {
        this.historiaClinica.set(historia);
        this.cargandoHistoria.set(false);

        // Reiniciar controles
        this.filtroEstado.set('');
        this.ordenDesc.set(true);
        this.expandedNotes.clear();

        // PLEGAR TODOS LOS GRUPOS al cargar
        const fechas = Array.from(new Set(historia.citas.map(c => c.fechaISO)));
        const collapsed: Record<string, boolean> = {};
        fechas.forEach(f => (collapsed[f] = false));
        this.openByDate.set(collapsed);
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
    this.openByDate.set({});
    this.expandedNotes.clear();
  }

  toggleGrupo(fechaISO: string) {
    const map = { ...this.openByDate() };
    map[fechaISO] = !(map[fechaISO] ?? false);
    this.openByDate.set(map);
  }

  formatFecha(fechaStr?: string | null): string {
    if (!fechaStr) return 'No registrada';
    try {
      if (fechaStr.includes('-')) {
        if (fechaStr.includes('T')) {
          const fecha = new Date(fechaStr);
          return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else {
          const parts = fechaStr.split('-');
          if (parts[0].length === 4) {
            const [year, month, day] = parts;
            return `${day}/${month}/${year}`;
          } else {
            const [day, month, year] = parts;
            return `${day}/${month}/${year}`;
          }
        }
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
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
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

  // === NUEVO: devolver solo el texto del estado
  estadoTexto(e: 'ACTIVO' | 'INACTIVO') {
    return e === 'ACTIVO' ? 'Activo' : 'Inactivo';
  }

  initials(p: Paciente): string {
    const a = (p.nombres || ' ')[0] ?? '';
    const b = (p.apellidos || ' ')[0] ?? '';
    return `${a}${b}`.toUpperCase();
  }

  trackByPacienteId = (_: number, paciente: Paciente) => paciente.id;
  trackByCitaId = (_: number, cita: CitaConFecha) => cita.id;
}
