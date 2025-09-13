
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-ingresar-paciente',
  templateUrl: './ingresar-paciente.component.html',
  styleUrl: './ingresar-paciente.component.css'
})
export class IngresarPacienteComponent {
  paciente = {
    nombre: '',
    identificacion: '',
    telefono: '',
    email: '',
    direccion: '',
    fechaNacimiento: '',
    ultimaVisita: '',
    estado: 'ACTIVO',
    creadoPorId: 1
  };

  constructor(private http: HttpClient) {}

  onSubmit(form: any) {
    // Convertir fechas a formato ISO con hora cero
    const pacienteData = {
      ...this.paciente,
      fechaNacimiento: this.paciente.fechaNacimiento ? new Date(this.paciente.fechaNacimiento).toISOString() : null,
      ultimaVisita: this.paciente.ultimaVisita ? new Date(this.paciente.ultimaVisita).toISOString() : null
    };
    this.http.post('http://localhost:3000/pacientes', pacienteData)
      .subscribe({
        next: (res) => alert('Paciente guardado correctamente'),
        error: (err) => alert('Error al guardar paciente')
      });
  }
}
