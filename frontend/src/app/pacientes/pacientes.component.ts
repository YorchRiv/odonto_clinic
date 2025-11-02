import { Component, OnInit, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { PacientesService, Paciente, PacienteEstado } from './pacientes.service';

declare var bootstrap: any;

type FiltroPac = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css'],
})
export class PacientesComponent implements OnInit {
  private svc = inject(PacientesService);
  private router = inject(Router);
  private auth = inject(AuthService);

  // UI / estado
  cargando = signal(false);
  pacientes = signal<Paciente[]>([]);
  search = signal('');
  filtro = signal<FiltroPac>('TODOS');

  // Modal
  @ViewChild('pacModal') pacModal!: ElementRef;
  private modalRef: any;
  creando = signal(false);
  editandoId: string | null = null;
  formError = signal<string>('');

  // Modelo del form
  form: any = this.blankForm();

  ngOnInit(): void {
    this.load();
  }

  private blankForm() {
    return {
      nombres: '',
      apellidos: '',
      telefono: '',
      email: '',
      direccion: '',
      estado: 'ACTIVO' as PacienteEstado,
      alergias: '',
      fechaNacimiento: '', // dd-MM-yyyy
      dpi: ''
    };
  }

  ensureModal() {
    if (!this.modalRef) {
      this.modalRef = new bootstrap.Modal(this.pacModal.nativeElement, { 
        backdrop: 'static' 
      });
      
      // IMPORTANTE: Agregar evento para resetear estado cuando se cierre el modal
      this.pacModal.nativeElement.addEventListener('hidden.bs.modal', () => {
        this.creando.set(false);
        this.formError.set('');
      });
    }
  }

  openCrear() {
    this.editandoId = null;
    this.formError.set('');
    this.form = this.blankForm();
    this.ensureModal();
    this.modalRef.show();
  }

  openEditar(p: Paciente) {
    this.editandoId = p.id;
    this.formError.set('');
    this.form = {
      nombres: p.nombres,
      apellidos: p.apellidos,
      telefono: p.telefono,
      email: p.email ?? '',
      direccion: p.direccion ?? '',
      estado: p.estado,
      alergias: p.alergias ?? '',
      fechaNacimiento: p.fechaNacimiento ?? '',
      dpi: p.dpi ?? ''
    };
    this.ensureModal();
    this.modalRef.show();
  }

  closeModal() {
    this.modalRef?.hide();
    // Resetear estado inmediatamente al cerrar
    this.creando.set(false);
    this.formError.set('');
  }

  // Cargar lista
  load() {
    this.cargando.set(true);
    this.svc.list().subscribe({
      next: (arr) => {
        this.pacientes.set(arr);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }

  // Buscador + filtro
  listaFiltrada = computed(() => {
    const q = this.search().trim().toLowerCase();
    const f = this.filtro();
    let arr = this.pacientes();

    if (f === 'ACTIVOS') arr = arr.filter(p => p.estado === 'ACTIVO');
    if (f === 'INACTIVOS') arr = arr.filter(p => p.estado === 'INACTIVO');

    if (q) {
      arr = arr.filter(p => {
        const full = `${p.nombres} ${p.apellidos}`.toLowerCase();
        return (
          full.includes(q) ||
          (p.telefono ?? '').toLowerCase().includes(q) ||
          (p.email ?? '').toLowerCase().includes(q) ||
          (p.dpi ?? '').toLowerCase().includes(q)
        );
      });
    }
    return arr;
  });

  setFiltro(f: FiltroPac) {
    this.filtro.set(f);
  }

  filtroLabel() {
    const f = this.filtro();
    return f === 'TODOS' ? 'Todos los pacientes' : (f === 'ACTIVOS' ? 'Activos' : 'Inactivos');
  }

  // Submit crear / editar - CORREGIDO
  submit(f: NgForm) {
    if (f.invalid) return;

    this.creando.set(true);
    this.formError.set('');

    const payload = {
      ...this.form,
      // normalizar strings vacíos a null para el service
      email: this.form.email?.trim() || null,
      direccion: this.form.direccion?.trim() || null,
      alergias: this.form.alergias?.trim() || null,
      fechaNacimiento: this.form.fechaNacimiento?.trim() || null,
      dpi: this.form.dpi?.trim() || null,
    };

    const obs = this.editandoId 
      ? this.svc.update(this.editandoId, payload)
      : this.svc.create(payload);

    obs.subscribe({
      next: () => {
        this.creando.set(false);
        this.closeModal();
        this.load();
      },
      error: (err: any) => {
        console.error('Error al guardar paciente:', err);
        this.creando.set(false);
        if (err?.message === 'PACIENTE_DUPLICADO') {
          this.formError.set('Ya existe un paciente con el mismo nombre y apellido.');
        } else if (err?.message === 'NO_ENCONTRADO') {
          this.formError.set('Paciente no encontrado.');
        } else {
          this.formError.set('Error al guardar el paciente. Intente nuevamente.');
        }
      }
    });
  }

  // Acciones
  verHistoria(p: Paciente) {
    // Placeholder: navegaremos a historia clínica del paciente más adelante
    alert(`Historia clínica de: ${p.nombres} ${p.apellidos} (pendiente)`);
  }

  agendar(p: Paciente) {
    // Navega a agenda y pre-carga el nombre del paciente por query param
    this.router.navigate(['/agenda'], { 
      queryParams: { paciente: `${p.nombres} ${p.apellidos}` } 
    });
  }

  eliminar(p: Paciente) {
    const current = this.auth.getCurrentUser();
    if (current?.rol === 'RECEPCIONISTA') {
      alert('No tiene permiso para eliminar');
      return;
    }

    if (!confirm(`Eliminar a ${p.nombres} ${p.apellidos}?`)) return;
    this.svc.delete(p.id).subscribe(() => this.load());
  }

  // Helpers UI
  initials(p: Paciente): string {
    const a = (p.nombres || ' ')[0] ?? '';
    const b = (p.apellidos || ' ')[0] ?? '';
    return `${a}${b}`.toUpperCase();
  }

  estadoClass(p: Paciente) {
    return p.estado === 'ACTIVO' ? 'status-pill activo' : 'status-pill inactivo';
  }

  trackById = (_: number, it: Paciente) => it.id;
}