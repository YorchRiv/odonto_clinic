import { Component, ElementRef, ViewChild, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AgendaService, CitaItem, CitaStatus } from '../agenda/agenda.service';
import { PacientesService, Paciente, PacienteCreate, PacienteEstado } from '../pacientes/pacientes.service';

declare var bootstrap: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private agendaSrv = inject(AgendaService);
  private pacientesSrv = inject(PacientesService);

  // ======= Citas por fecha (filtro) =======
  citasFecha = signal<CitaItem[]>([]);
  cargandoCitas = signal<boolean>(false);

  // input del datepicker (yyyy-MM-dd). Inicia en HOY.
  fechaFiltroInput = this.toDateInput(new Date());
  // representación dd-MM-yyyy (key para API)
  fechaFiltroKey = computed(() => this.toFechaKey(this.fechaFiltroInput));

  // métricas (solo cuentan citas no-DISPONIBLE)
  citasFechaCount = computed(() => this.citasFecha().filter(c => c.status !== 'DISPONIBLE').length);

  // lista ordenada y SIN “DISPONIBLE” (solo citas reales)
  citasFechaTop = computed(() =>
    [...this.citasFecha()]
      .filter(c => c.status !== 'DISPONIBLE')
      .sort((a, b) => a.hora.localeCompare(b.hora))
  );

  // ===== Pacientes (para métricas y autocompletar) =====
  pacientes = signal<Paciente[]>([]);
  pacActivosCount   = computed(() => this.pacientes().filter(p => p.estado === 'ACTIVO').length);
  pacInactivosCount = computed(() => this.pacientes().filter(p => p.estado === 'INACTIVO').length);
  pacTotalCount     = computed(() => this.pacientes().length);

  ngOnInit(): void {
    this.cargarCitasPorFecha(this.fechaFiltroKey());
    this.refrescarPacientes(); // métricas y autocomplete
  }

  private refrescarPacientes() {
    this.pacientesSrv.list().subscribe(arr => this.pacientes.set(arr));
  }

  private cargarCitasPorFecha(fechaKey: string) {
    this.cargandoCitas.set(true);
    this.agendaSrv.getAgendaDia(fechaKey).subscribe({
      next: (res) => {
        const arr: CitaItem[] = res.items ?? [];
        this.citasFecha.set(arr);
        this.cargandoCitas.set(false);
      },
      error: () => {
        this.citasFecha.set([]);
        this.cargandoCitas.set(false);
      }
    });
  }

  // Al cambiar el datepicker
  onFechaFiltroChange(val: string) {
    this.fechaFiltroInput = val;
    this.cargarCitasPorFecha(this.toFechaKey(val));
  }

  // Botón “Hoy”
  goHoy() {
    const hoy = new Date();
    this.fechaFiltroInput = this.toDateInput(hoy);
    this.cargarCitasPorFecha(this.hoyKey());
  }

  // ===== Helpers de UI =====
  hoyKey(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`; // dd-MM-yyyy
  }

  private toDateInput(d: Date): string {
    return [
      d.getFullYear(),
      String(d.getMonth()+1).padStart(2,'0'),
      String(d.getDate()).padStart(2,'0')
    ].join('-'); // yyyy-MM-dd
  }

  horaAMPM(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  etiquetaStatus(s: CitaStatus) {
    const map: Record<CitaStatus, string> = {
      CONFIRMADA: 'Confirmada',
      PENDIENTE:  'Pendiente',
      NUEVA:      'Nueva',
      FINALIZADA: 'Finalizada',
      CANCELADA:  'Cancelada',
      DISPONIBLE: 'Disponible'
    };
    return map[s] ?? s;
  }

  trackById = (_:number, it:CitaItem) => it.id;

  // ===== Modal: Nueva Cita =====
  @ViewChild('crearCitaModal') crearCitaModal!: ElementRef;
  @ViewChild('nuevoPacienteModal') nuevoPacienteModal!: ElementRef;

  private modalRef: any;
  private pacienteModalRef: any;

  creando = signal(false);
  formError = signal('');

  form = { hora: '', motivo: '', notas: '' };
  dateInput = ''; // yyyy-MM-dd

  // ===== AUTOCOMPLETE PACIENTE =====
  pacienteTexto = signal<string>('');
  pacienteSeleccionadoId = signal<string | null>(null);
  mostrandoSugerencias = signal<boolean>(false);
  pacienteError = signal<string>('');

  resultadosPacientes = computed(() => {
    const q = this.pacienteTexto().trim().toLowerCase();
    if (!q) return [];
    return this.pacientes().filter((p: Paciente) => {
      const full = `${p.nombres} ${p.apellidos}`.toLowerCase();
      return full.includes(q)
        || (p.dpi ?? '').toLowerCase().includes(q)
        || (p.telefono ?? '').toLowerCase().includes(q);
    }).slice(0, 12);
  });

  onPacienteTextoChange(val: string) {
    this.pacienteTexto.set(val);
    this.pacienteSeleccionadoId.set(null);
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

  irACrearPacienteDesdeCita() {
    window.location.href = '/pacientes?nuevo=1&nombre=' + encodeURIComponent(this.pacienteTexto());
  }

  // ===== MÉTODOS PARA MODAL DE CITA =====
  openNuevaCita() {
    this.formError.set('');
    this.pacienteError.set('');
    this.form = { hora: '', motivo: '', notas: '' };

    // prellenar con fecha del filtro actual
    this.dateInput = this.fechaFiltroInput;

    this.pacienteTexto.set('');
    this.pacienteSeleccionadoId.set(null);
    this.mostrandoSugerencias.set(false);

    this.ensureModal();
    this.modalRef.show();
  }

  closeNuevaCita() {
    this.modalRef?.hide();
    this.creando.set(false);
  }

  private ensureModal() {
    if (!this.modalRef) {
      this.modalRef = new bootstrap.Modal(this.crearCitaModal.nativeElement, { backdrop: 'static' });
    }
  }

  private toFechaKey(dateInput: string): string {
    const [y, m, d] = dateInput.split('-');
    return `${d}-${m}-${y}`; // dd-MM-yyyy
  }

  submitNuevaCita(f: NgForm) {
    if (f.invalid) return;

    if (!this.pacienteSeleccionadoId()) {
      this.pacienteError.set('Debes seleccionar un paciente existente.');
      return;
    }

    this.creando.set(true);
    this.formError.set('');
    const fechaISO = this.toFechaKey(this.dateInput);

    this.agendaSrv.crearCita({
      fechaISO,
      hora: this.form.hora,
      pacienteId: this.pacienteSeleccionadoId()!,
      pacienteNombre: this.pacienteTexto().trim(),
      motivo: this.form.motivo,
      notas: this.form.notas
    }).subscribe({
      next: () => {
        this.creando.set(false);
        this.closeNuevaCita();

        // Si la nueva cita coincide con la fecha seleccionada, refresca
        if (fechaISO === this.fechaFiltroKey()) {
          this.cargarCitasPorFecha(fechaISO);
        }
      },
      error: (err:any) => {
        this.creando.set(false);
        if (err?.message === 'HORARIO_OCUPADO') this.formError.set('Ya existe una cita a esa hora para esa fecha.');
        else this.formError.set('No se pudo crear la cita.');
      }
    });
  }

  // ===== Modal: Nuevo Paciente (acciones rápidas) =====
  guardandoPaciente = signal(false);
  pacienteFormError = signal('');

  pacienteFormData = {
    nombres: '',
    apellidos: '',
    telefono: '',
    email: '',
    direccion: '',
    estado: 'ACTIVO' as PacienteEstado,
    alergias: '',
    fechaNacimiento: '',
    dpi: ''
  };

  openNuevoPaciente() {
    this.pacienteFormError.set('');
    this.pacienteFormData = {
      nombres: '',
      apellidos: '',
      telefono: '',
      email: '',
      direccion: '',
      estado: 'ACTIVO',
      alergias: '',
      fechaNacimiento: '',
      dpi: ''
    };

    this.ensurePacienteModal();
    this.pacienteModalRef.show();
  }

  closeNuevoPaciente() {
    this.pacienteModalRef?.hide();
    this.guardandoPaciente.set(false);
  }

  private ensurePacienteModal() {
    if (!this.pacienteModalRef) {
      this.pacienteModalRef = new bootstrap.Modal(this.nuevoPacienteModal.nativeElement, {
        backdrop: 'static'
      });

      this.nuevoPacienteModal.nativeElement.addEventListener('hidden.bs.modal', () => {
        this.guardandoPaciente.set(false);
        this.pacienteFormError.set('');
      });
    }
  }

  submitNuevoPaciente(f: NgForm) {
    if (f.invalid) return;

    this.guardandoPaciente.set(true);
    this.pacienteFormError.set('');

    const payload: PacienteCreate = {
      ...this.pacienteFormData,
      email: this.pacienteFormData.email?.trim() || null,
      direccion: this.pacienteFormData.direccion?.trim() || null,
      alergias: this.pacienteFormData.alergias?.trim() || null,
      fechaNacimiento: this.pacienteFormData.fechaNacimiento?.trim() || null,
      dpi: this.pacienteFormData.dpi?.trim() || null,
    };

    this.pacientesSrv.create(payload).subscribe({
      next: () => {
        this.guardandoPaciente.set(false);
        this.closeNuevoPaciente();
        // Refresca lista => actualiza métricas y autocomplete
        this.refrescarPacientes();
      },
      error: (err: any) => {
        this.guardandoPaciente.set(false);
        if (err?.message === 'PACIENTE_DUPLICADO') {
          this.pacienteFormError.set('Ya existe un paciente con el mismo nombre y apellido.');
        } else {
          this.pacienteFormError.set('Error al guardar el paciente. Intente nuevamente.');
        }
      }
    });
  }
}
