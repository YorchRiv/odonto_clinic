import { Component, OnInit, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { AgendaDia, AgendaService, CitaItem } from './agenda.service';

declare var bootstrap: any;

/** Celdas del mini-calendario */
interface DiaCalendario {
  date: Date | null;
  delMesActual: boolean;
  esHoy: boolean;
  esSeleccionado: boolean;
  numero?: number;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css'],
})
export class AgendaComponent implements OnInit {
  private agendaSrv = inject(AgendaService);

  // ===== Calendario =====
  hoy = new Date();
  mesRef = signal(new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1));
  seleccionado = signal(new Date(this.hoy));

  // ===== Datos del día =====
  agendaDelDia = signal<AgendaDia | null>(null);

  // ===== Etiquetas UI =====
  etiquetaMes = computed(() =>
    this.mesRef().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  /** Encabezado de la lista del día, ahora en formato dd-MM-yyyy */
  etiquetaFechaSeleccionada = computed(() => this.formateaFechaKey(this.seleccionado()));

  grillaCalendario = computed<DiaCalendario[][]>(() => this.construirGrilla(this.mesRef(), this.seleccionado()));

  // ===== Modal Nueva/Editar =====
  @ViewChild('citaModal') citaModal!: ElementRef;
  private modalRef: any;
  creando = signal(false);
  editandoId: string | null = null;

  // Modelo del formulario
  nuevaCita = { hora: '', paciente: '', motivo: '', notas: '' };

  // Mensaje de error (p.ej. choque de horario)
  formError = signal<string>('');

  ngOnInit(): void { this.cargarAgendaDelDia(this.seleccionado()); }

  // ---------- helpers de fecha ----------
  /**
   * Devuelve la clave de fecha usada para llamadas/almacenamiento: dd-MM-yyyy
   */
  private formateaFechaKey(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  // ---------- abrir/cerrar modal ----------
  openNuevaCita(hora?: string) {
    this.editandoId = null;
    this.formError.set('');
    this.nuevaCita = { hora: hora ?? '', paciente: '', motivo: '', notas: '' };
    this.ensureModal(); this.modalRef.show();
  }
  openEditarCita(item: CitaItem) {
    this.editandoId = item.id;
    this.formError.set('');
    this.nuevaCita = {
      hora: item.hora,
      paciente: item.paciente ?? '',
      motivo: item.motivo ?? '',
      notas: item.notas ?? ''
    };
    this.ensureModal(); this.modalRef.show();
  }
  closeNuevaCita() { this.modalRef?.hide(); }
  private ensureModal() {
    if (!this.modalRef) this.modalRef = new bootstrap.Modal(this.citaModal.nativeElement, { backdrop: 'static' });
  }

  // ---------- submit crear/editar ----------
  submitNuevaCita(form: NgForm) {
    if (form.invalid) return;
    const fechaKey = this.formateaFechaKey(this.seleccionado());
    this.creando.set(true);
    this.formError.set('');

    if (!this.editandoId) {
      // Crear
      this.agendaSrv.crearCita({ fechaISO: fechaKey, ...this.nuevaCita }).subscribe({
        next: () => { this.creando.set(false); this.closeNuevaCita(); this.cargarAgendaDelDia(this.seleccionado()); },
        error: (err: any) => {
          this.creando.set(false);
          if (err?.message === 'HORARIO_OCUPADO') this.formError.set('Ya existe una cita a esa hora. Elige otra.');
          else this.formError.set('No se pudo crear la cita.');
        }
      });
    } else {
      // Editar
      this.agendaSrv.actualizarCita(this.editandoId, fechaKey, this.nuevaCita).subscribe({
        next: () => { this.creando.set(false); this.closeNuevaCita(); this.cargarAgendaDelDia(this.seleccionado()); },
        error: (err: any) => {
          this.creando.set(false);
          if (err?.message === 'HORARIO_OCUPADO') this.formError.set('Ya existe una cita a esa hora. Elige otra.');
          else this.formError.set('No se pudo guardar la cita.');
        }
      });
    }
  }

  // ---------- navegación calendario ----------
  mesAnterior(): void { const m = this.mesRef(); this.mesRef.set(new Date(m.getFullYear(), m.getMonth() - 1, 1)); }
  mesSiguiente(): void { const m = this.mesRef(); this.mesRef.set(new Date(m.getFullYear(), m.getMonth() + 1, 1)); }

  elegirDia(celda: DiaCalendario): void {
    if (!celda.date) return;
    this.seleccionado.set(celda.date);
    this.mesRef.set(new Date(celda.date.getFullYear(), celda.date.getMonth(), 1));
    this.cargarAgendaDelDia(celda.date);
  }

  // ---------- carga del día ----------
  private cargarAgendaDelDia(d: Date) {
    const fechaKey = this.formateaFechaKey(d);
    this.agendaSrv.getAgendaDia(fechaKey).subscribe(res => this.agendaDelDia.set(res));
  }

  // ---------- construir grilla ----------
  private construirGrilla(mesRef: Date, seleccionado: Date): DiaCalendario[][] {
    const y = mesRef.getFullYear(), m = mesRef.getMonth();
    const primeroMes = new Date(y, m, 1), inicioSemana = primeroMes.getDay(); // 0=Dom
    const diasEnMes = new Date(y, m + 1, 0).getDate();

    const celdas: DiaCalendario[] = [];
    for (let i = 0; i < inicioSemana; i++) celdas.push({ date: null, delMesActual: false, esHoy: false, esSeleccionado: false });
    for (let d = 1; d <= diasEnMes; d++) {
      const fecha = new Date(y, m, d);
      const esHoy = this.esMismaFecha(fecha, this.hoy);
      const esSel = this.esMismaFecha(fecha, seleccionado);
      celdas.push({ date: fecha, numero: d, delMesActual: true, esHoy, esSeleccionado: esSel });
    }
    while (celdas.length % 7 !== 0) celdas.push({ date: null, delMesActual: false, esHoy: false, esSeleccionado: false });
    while (celdas.length < 42) celdas.push({ date: null, delMesActual: false, esHoy: false, esSeleccionado: false });

    const filas: DiaCalendario[][] = [];
    for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7));
    return filas;
  }

  private esMismaFecha(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

  // ---------- Acciones rápidas ----------
  marcarComo(id: string, status: CitaItem['status']) {
    const fechaKey = this.formateaFechaKey(this.seleccionado());
    this.agendaSrv.actualizarEstado(id, status, fechaKey).subscribe(() => this.cargarAgendaDelDia(this.seleccionado()));
  }
  eliminarCita(id: string) {
    const fechaKey = this.formateaFechaKey(this.seleccionado());
    this.agendaSrv.eliminarCita(fechaKey, id).subscribe(() => this.cargarAgendaDelDia(this.seleccionado()));
  }

  trackById = (_: number, it: CitaItem) => it.id;
}
