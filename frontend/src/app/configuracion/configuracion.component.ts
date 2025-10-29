import { Component, OnInit, computed, ElementRef, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { UsuariosService, Usuario, UsuarioCreate, Rol } from './configuracion.service';


declare var bootstrap: any;

type FiltroRol = 'TODOS' | Rol;

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css'],
})
export class ConfiguracionComponent implements OnInit {
  private svc = inject(UsuariosService);

  // Estado UI
  cargando = signal(false);
  usuarios = signal<Usuario[]>([]);
  search = signal('');
  filtroRol = signal<FiltroRol>('TODOS');

  // Modal
  @ViewChild('usrModal') usrModal!: ElementRef;
  private modalRef: any;
  creando = signal(false);
  editandoId: string | null = null;
  formError = signal('');

  // Modelo form
  form: any = this.blankForm();
  roles: Rol[] = ['ADMIN', 'DOCTOR', 'RECEPCIONISTA'];
  listaDoctores: Usuario[] = [];

  ngOnInit(): void { this.load(); }

  private blankForm() {
    return {
      nombre: '',
      apellido: '',
      email: '',
      password: '', // requerido solo al crear
      rol: 'RECEPCIONISTA' as Rol,
      refreshToken: null
    };
  }

  ensureModal() {
    if (!this.modalRef) {
      this.modalRef = new bootstrap.Modal(this.usrModal.nativeElement, { backdrop: 'static' });
      this.usrModal.nativeElement.addEventListener('hidden.bs.modal', () => {
        this.creando.set(false);
        this.formError.set('');
      });
    }
  }

  openCrear() {
  this.editandoId = null;
  this.formError.set('');
  this.form = this.blankForm();
  this.form.refreshToken = null;
  this.ensureModal();
  this.modalRef.show();
  }

  openEditar(u: Usuario) {
  this.editandoId = u.id;
  this.formError.set('');
  this.form = { nombre: u.nombre, apellido: u.apellido, email: u.email, password: '', rol: u.rol, refreshToken: null };
  this.ensureModal();
  this.modalRef.show();
  }

  closeModal() {
    this.modalRef?.hide();
    this.creando.set(false);
    this.formError.set('');
  }

  // Cargar lista
  load() {
    this.cargando.set(true);
    this.svc.list().subscribe({
      next: arr => {
        this.usuarios.set(arr);
        this.listaDoctores = arr.filter(u => u.rol === 'ADMIN' || u.rol === 'DOCTOR');
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  // Buscador + filtro
  listaFiltrada = computed(() => {
    const q = this.search().trim().toLowerCase();
    const role = this.filtroRol();
    let arr = this.usuarios();

    if (role !== 'TODOS') arr = arr.filter(u => u.rol === role);

    if (q) {
      arr = arr.filter(u => {
        const full = `${u.nombre} ${u.apellido}`.toLowerCase();
        return full.includes(q) || u.email.toLowerCase().includes(q) || u.rol.toLowerCase().includes(q);
      });
    }
    return arr;
  });

  setFiltroRol(f: FiltroRol) { this.filtroRol.set(f); }

  // Submit crear / editar
  submit(f: NgForm) {
    if (f.invalid) return;

    this.creando.set(true);
    this.formError.set('');

    const payload: any = {
      nombre: this.form.nombre?.trim(),
      apellido: this.form.apellido?.trim(),
      email: this.form.email?.trim(),
      rol: this.form.rol,
    };
    if (!this.editandoId && this.form.password) payload['password'] = this.form.password.trim();
    if (this.editandoId && this.form.password) payload['password'] = this.form.password.trim(); // cambiar contraseña opcional
    // Si el rol es RECEPCIONISTA, agregar refreshToken obligatorio
    if (this.form.rol === 'RECEPCIONISTA') {
      payload['refreshToken'] = (this.form.refreshToken && this.form.refreshToken !== '') ? String(this.form.refreshToken) : null;
    }
    console.log('Payload enviado:', payload);
    const obs = this.editandoId
      ? this.svc.update(this.editandoId, payload)
      : this.svc.create(payload as UsuarioCreate);

    obs.subscribe({
      next: () => { this.creando.set(false); this.closeModal(); this.load(); },
      error: (err: any) => {
        this.creando.set(false);
        if (err?.message === 'EMAIL_DUPLICADO') this.formError.set('Ya existe un usuario con ese correo.');
        else if (err?.message === 'NO_ENCONTRADO') this.formError.set('Usuario no encontrado.');
        else this.formError.set('Error al guardar el usuario. Intenta de nuevo.');
      }
    });
  }

  eliminar(u: Usuario) {
    if (!confirm(`Eliminar a ${u.nombre} ${u.apellido}?`)) return;
    this.svc.delete(u.id).subscribe(() => this.load());
  }

  initials(u: Usuario) {
    const a = (u.nombre || ' ')[0] ?? '';
    const b = (u.apellido || ' ')[0] ?? '';
    return `${a}${b}`.toUpperCase();
  }

  rolClass(u: Usuario) {
    switch (u.rol) {
      case 'ADMIN': return 'role-pill admin';
      case 'DOCTOR': return 'role-pill doctor';
      default: return 'role-pill recep';
    }
  }

  trackById = (_: number, it: Usuario) => it.id;
}
