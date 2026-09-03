import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { UsuariosService } from '../configuracion/configuracion.service';
import { AuthService, LoggedUser } from '../core/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent {
  private auth = inject(AuthService);
  private usuarios = inject(UsuariosService);

  user: LoggedUser | null = this.auth.getCurrentUser();
  form = { nombre: this.user?.nombre ?? '', apellido: this.user?.apellido ?? '', email: this.user?.email ?? '' };
  password = { nueva: '', confirmar: '' };
  saving = false;
  savingPassword = false;
  message = '';
  error = '';
  showPassword = false;

  get initials(): string {
    return `${this.user?.nombre?.[0] ?? ''}${this.user?.apellido?.[0] ?? ''}`.toUpperCase() || 'OC';
  }

  get roleLabel(): string {
    const labels: Record<string, string> = { ADMIN: 'Administrador', DOCTOR: 'Doctor', RECEPCIONISTA: 'Recepcionista' };
    return labels[this.user?.rol ?? ''] ?? 'Usuario';
  }

  saveProfile(formRef: NgForm): void {
    if (!this.user || formRef.invalid) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    this.usuarios.update(String(this.user.id), this.form).subscribe({
      next: updated => {
        this.auth.updateStoredUser(updated);
        this.user = this.auth.getCurrentUser();
        this.message = 'Información personal actualizada.';
        this.saving = false;
      },
      error: () => {
        this.error = 'No fue posible actualizar el perfil.';
        this.saving = false;
      }
    });
  }

  updatePassword(formRef: NgForm): void {
    if (!this.user || formRef.invalid) return;
    if (this.password.nueva !== this.password.confirmar) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.savingPassword = true;
    this.message = '';
    this.error = '';
    this.usuarios.update(String(this.user.id), { password: this.password.nueva }).subscribe({
      next: () => {
        this.password = { nueva: '', confirmar: '' };
        formRef.resetForm(this.password);
        this.message = 'Contraseña actualizada correctamente.';
        this.savingPassword = false;
      },
      error: () => {
        this.error = 'No fue posible actualizar la contraseña.';
        this.savingPassword = false;
      }
    });
  }
}

