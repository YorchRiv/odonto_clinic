import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CitaConFecha, HistoriaClinicaService } from '../historia-clinica/historia-clinica.service';
import { Paciente, PacientesService } from './pacientes.service';

@Component({
  selector: 'app-paciente-perfil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './paciente-perfil.component.html',
  styleUrls: ['./paciente-perfil.component.css']
})
export class PacientePerfilComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pacientesService = inject(PacientesService);
  private historiaService = inject(HistoriaClinicaService);

  paciente = signal<Paciente | null>(null);
  citas = signal<CitaConFecha[]>([]);
  cargando = signal(true);
  error = signal('');

  citasFinalizadas = computed(() => this.citas().filter(cita => cita.status === 'FINALIZADA').length);
  citasActivas = computed(() => this.citas().filter(cita => !['FINALIZADA', 'CANCELADA'].includes(cita.status)).length);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Paciente no encontrado.');
      this.cargando.set(false);
      return;
    }

    this.pacientesService.getById(id).subscribe({
      next: paciente => {
        this.paciente.set(paciente);
        if (!paciente) this.error.set('Paciente no encontrado.');
      },
      error: () => this.error.set('No fue posible cargar el paciente.')
    });
    this.historiaService.getHistoriaClinica(id).subscribe({
      next: historia => {
        this.citas.set(historia.citas ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.citas.set([]);
        this.cargando.set(false);
      }
    });
  }

  get initials(): string {
    const patient = this.paciente();
    return `${patient?.nombres?.[0] ?? ''}${patient?.apellidos?.[0] ?? ''}`.toUpperCase();
  }

  agendar(): void {
    this.router.navigate(['/agenda'], { queryParams: { nueva: 1, pacienteId: this.paciente()?.id } });
  }

  verHistoria(): void {
    const patient = this.paciente();
    if (patient) this.router.navigate(['/historia-clinica'], { queryParams: { pacienteId: patient.id } });
  }
}

