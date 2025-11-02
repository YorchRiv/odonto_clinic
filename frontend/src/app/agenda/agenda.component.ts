import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AgendaDia, AgendaService, CitaItem } from './agenda.service';
import { PacientesService, Paciente } from '../pacientes/pacientes.service'; // ajusta ruta si es necesario
import { AuthService } from '../core/auth.service';

declare var bootstrap: any;

/** Celdas del mini-calendario */
interface DiaCalendario {
  date: Date | null;
  delMesActual: boolean;
  esHoy: boolean;
  esSeleccionado: boolean;
  numero?: number;
}

/** Filtro por estado */
type FiltroStatus =
  | 'TODAS'
  | 'CONFIRMADA'
  | 'PENDIENTE'
  | 'NUEVA'
  | 'FINALIZADA'
  | 'CANCELADA';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css'],
})
export class AgendaComponent implements OnInit {
  private agendaSrv = inject(AgendaService);
  private pacSvc = inject(PacientesService);
  private auth = inject(AuthService);

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

  /** Encabezado del día en formato dd-MM-yyyy */
  etiquetaFechaSeleccionada = computed(() =>
    this.formateaFechaKey(this.seleccionado())
  );

  grillaCalendario = computed<DiaCalendario[][]>(() =>
    this.construirGrilla(this.mesRef(), this.seleccionado())
  );

  // ===== Filtro de estado =====
  filtroStatus = signal<FiltroStatus>('TODAS');

  itemsFiltrados(list: CitaItem[]) {
    const f = this.filtroStatus();
    return f === 'TODAS' ? list : list.filter((i) => i.status === f);
  }
  setFiltro(f: FiltroStatus) {
    this.filtroStatus.set(f);
  }
  isFiltro(f: FiltroStatus) {
    return this.filtroStatus() === f;
  }
  labelFiltroActual() {
    const f = this.filtroStatus();
    return f === 'TODAS' ? 'Todas' : f[0] + f.slice(1).toLowerCase();
  }

  // ===== Modal =====
  @ViewChild('citaModal') citaModal!: ElementRef;
  private modalRef: any;
  creando = signal(false);
  editandoId: string | null = null;

  // Modelo del formulario de cita
  nuevaCita = { hora: '', paciente: '', motivo: '', notas: '' };
  formError = signal<string>('');

  // ====== Fecha del modal (para <input type="date">) ======
  /** Bind para el input date en formato 'yyyy-MM-dd' */
  dateInput: string = '';

  // ====== AUTOCOMPLETE PACIENTE ======
  pacientes = signal<Paciente[]>([]);
  pacienteTexto = signal<string>('');             // lo que escribe el usuario
  pacienteSeleccionadoId = signal<string | null>(null);
  mostrandoSugerencias = signal<boolean>(false);
  pacienteError = signal<string>('');

  resultadosPacientes = computed(() => {
    const q = this.pacienteTexto().trim().toLowerCase();
    if (!q) return [];
    return this.pacientes().filter(p => {
      const full = `${p.nombres} ${p.apellidos}`.toLowerCase();
      return full.includes(q)
          || (p.dpi ?? '').toLowerCase().includes(q)
          || (p.telefono ?? '').toLowerCase().includes(q);
    }).slice(0, 12);
  });

  showSugerencias = () => this.mostrandoSugerencias();

  onPacienteTextoChange(val: string) {
    this.pacienteTexto.set(val);
    this.pacienteSeleccionadoId.set(null); // al teclear se invalida la selección previa
    this.mostrandoSugerencias.set(true);
    this.pacienteError.set('');
  }

  onPacienteBlur() {
    setTimeout(() => this.mostrandoSugerencias.set(false), 150);
  }

  selectPaciente(p: Paciente) {
    this.pacienteTexto.set(`${p.nombres} ${p.apellidos}`);
    this.pacienteSeleccionadoId.set(p.id);
    this.mostrandoSugerencias.set(false);
    this.pacienteError.set('');
  }

  initialsPac(p: Paciente) {
    const a = (p.nombres || ' ')[0] ?? '';
    const b = (p.apellidos || ' ')[0] ?? '';
    return `${a}${b}`.toUpperCase();
  }

  trackByPacId = (_: number, it: Paciente) => it.id;

  irACrearPaciente() {
    window.location.href = '/pacientes?nuevo=1&nombre=' + encodeURIComponent(this.pacienteTexto());
  }

  // ===================== Ciclo de vida =====================
  ngOnInit(): void {
    // sincroniza input del modal con el seleccionado y carga el día
    this.dateInput = this.toYMD(this.seleccionado());
    this.cargarAgendaDelDia(this.seleccionado());

    // cargar pacientes para el autocompletado
    this.pacSvc.list().subscribe(arr => this.pacientes.set(arr));
  }

  // ---------- helpers de fecha ----------
  /** Devuelve la clave dd-MM-yyyy usada en almacenamiento y consultas */
  private formateaFechaKey(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  /** Date -> 'yyyy-MM-dd' (para <input type="date">) */
  private toYMD(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /** 'yyyy-MM-dd' -> Date */
  private fromYMD(s: string): Date {
    if (!s) return new Date(this.seleccionado());
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  // ---------- respuesta al cambio de fecha en el modal ----------
  onFechaInputChange(ymd: string) {
    this.dateInput = ymd;
    const nueva = this.fromYMD(ymd);
    // sincroniza con mini-calendario y vuelve a cargar el día
    this.seleccionado.set(nueva);
    this.mesRef.set(new Date(nueva.getFullYear(), nueva.getMonth(), 1));
    this.cargarAgendaDelDia(nueva);
  }

  // ---------- modal ----------
  openNuevaCita(hora?: string) {
    this.editandoId = null;
    this.formError.set('');
    this.pacienteError.set('');
    this.dateInput = this.toYMD(this.seleccionado()); // sincroniza fecha del modal
    this.nuevaCita = { hora: hora ?? '', paciente: '', motivo: '', notas: '' };
    this.pacienteTexto.set('');
    this.pacienteSeleccionadoId.set(null);
    this.mostrandoSugerencias.set(false);
    this.ensureModal();
    this.modalRef.show();
  }

  openEditarCita(item: CitaItem) {
    this.editandoId = item.id;
    this.formError.set('');
    this.pacienteError.set('');
    this.dateInput = this.toYMD(this.seleccionado()); // mantenemos el día visible
    this.nuevaCita = {
      hora: item.hora,
      paciente: item.paciente ?? '',
      motivo: item.motivo ?? '',
      notas: item.notas ?? '',
    };
    this.pacienteTexto.set(item.paciente ?? '');
    this.pacienteSeleccionadoId.set(item.pacienteId ?? null);
    this.mostrandoSugerencias.set(false);
    this.ensureModal();
    this.modalRef.show();
  }

  closeNuevaCita() {
    this.modalRef?.hide();
  }

  private ensureModal() {
    if (!this.modalRef) {
      this.modalRef = new bootstrap.Modal(this.citaModal.nativeElement, {
        backdrop: 'static',
      });
    }
  }

  // ---------- submit crear/editar ----------
  submitNuevaCita(form: NgForm) {
    if (form.invalid) return;

    // Exigir selección válida de paciente existente
    if (!this.pacienteSeleccionadoId()) {
      this.pacienteError.set('Debes seleccionar un paciente existente.');
      return;
    }

    // Toma la fecha del input ('yyyy-MM-dd') y la convierte a dd-MM-yyyy
    const fechaKey = this.formateaFechaKey(this.fromYMD(this.dateInput));
    this.creando.set(true);
    this.formError.set('');
    this.pacienteError.set('');

    if (!this.editandoId) {
      this.agendaSrv
        .crearCita({
          fechaISO: fechaKey,
          hora: this.nuevaCita.hora,
          pacienteId: this.pacienteSeleccionadoId()!,   // validado arriba
          pacienteNombre: this.pacienteTexto().trim(),  // lo que verá la UI
          motivo: this.nuevaCita.motivo,
          notas: this.nuevaCita.notas,
        })
        .subscribe({
          next: () => {
            this.creando.set(false);
            this.closeNuevaCita();
            const d = this.fromYMD(this.dateInput);
            this.seleccionado.set(d);
            this.cargarAgendaDelDia(d);
          },
          error: (err: any) => {
            this.creando.set(false);
            if (err?.message === 'HORARIO_OCUPADO')
              this.formError.set('Ya existe una cita a esa hora. Elige otra.');
            else this.formError.set('No se pudo crear la cita.');
          },
        });
    } else {
      // Nota: con el mock actual no movemos la cita de día al editar.
      this.agendaSrv
        .actualizarCita(this.editandoId, fechaKey, {
          hora: this.nuevaCita.hora,
          paciente: this.pacienteTexto().trim(),
          motivo: this.nuevaCita.motivo,
          notas: this.nuevaCita.notas,
        })
        .subscribe({
          next: () => {
            this.creando.set(false);
            this.closeNuevaCita();
            this.cargarAgendaDelDia(this.fromYMD(this.dateInput));
          },
          error: (err: any) => {
            this.creando.set(false);
            if (err?.message === 'HORARIO_OCUPADO')
              this.formError.set('Ya existe una cita a esa hora. Elige otra.');
            else this.formError.set('No se pudo guardar la cita.');
          },
        });
    }
  }

  // ---------- navegación calendario ----------
  mesAnterior(): void {
    const m = this.mesRef();
    this.mesRef.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  mesSiguiente(): void {
    const m = this.mesRef();
    this.mesRef.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  elegirDia(celda: DiaCalendario): void {
    if (!celda.date) return;
    this.seleccionado.set(celda.date);
    this.mesRef.set(new Date(celda.date.getFullYear(), celda.date.getMonth(), 1));
    this.dateInput = this.toYMD(celda.date); // <— sincroniza el input del modal
    this.cargarAgendaDelDia(celda.date);
  }

  // ---------- carga del día ----------
  private cargarAgendaDelDia(d: Date) {
    const fechaKey = this.formateaFechaKey(d);
    this.agendaSrv.getAgendaDia(fechaKey).subscribe((res) => {
      this.agendaDelDia.set(res);
    });
  }

  // ---------- construir grilla ----------
  private construirGrilla(mesRef: Date, seleccionado: Date): DiaCalendario[][] {
    const y = mesRef.getFullYear(), m = mesRef.getMonth();
    const primeroMes = new Date(y, m, 1), inicioSemana = primeroMes.getDay(); // 0=Dom
    const diasEnMes = new Date(y, m + 1, 0).getDate();

    const celdas: DiaCalendario[] = [];
    for (let i = 0; i < inicioSemana; i++)
      celdas.push({ date: null, delMesActual: false, esHoy: false, esSeleccionado: false });

    for (let d = 1; d <= diasEnMes; d++) {
      const fecha = new Date(y, m, d);
      const esHoy = this.esMismaFecha(fecha, this.hoy);
      const esSel = this.esMismaFecha(fecha, seleccionado);
      celdas.push({ date: fecha, numero: d, delMesActual: true, esHoy, esSeleccionado: esSel });
    }

    while (celdas.length % 7 !== 0)
      celdas.push({ date: null, delMesActual: false, esHoy: false, esSeleccionado: false });
    while (celdas.length < 42)
      celdas.push({ date: null, delMesActual: false, esHoy: false, esSeleccionado: false });

    const filas: DiaCalendario[][] = [];
    for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7));
    return filas;
  }

  private esMismaFecha(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  // ---------- Acciones rápidas ----------
  marcarComo(id: string, status: CitaItem['status']) {
    const fechaKey = this.formateaFechaKey(this.seleccionado());
    this.agendaSrv
      .actualizarEstado(id, status, fechaKey)
      .subscribe(() => this.cargarAgendaDelDia(this.seleccionado()));
  }

  eliminarCita(id: string) {
    const current = this.auth.getCurrentUser();
    if (current?.rol === 'RECEPCIONISTA') {
      alert('No tiene permiso para eliminar');
      return;
    }

    const fechaKey = this.formateaFechaKey(this.seleccionado());
    this.agendaSrv
      .eliminarCita(fechaKey, id)
      .subscribe(() => this.cargarAgendaDelDia(this.seleccionado()));
  }

  trackById = (_: number, it: CitaItem) => it.id;
}
