import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, delay, map } from 'rxjs';
import { AuthService } from '../core/auth.service';

export type PacienteEstado = 'ACTIVO' | 'INACTIVO';

export interface Paciente {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  estado: PacienteEstado;
  alergias?: string | null;
  /** UI: 'dd-MM-yyyy' */
  fechaNacimiento?: string | null;
  dpi?: string | null;

  creadoPorId?: string; // ID del usuario que creó el paciente
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
}

export type PacienteCreate = Omit<Paciente, 'id'|'createdAt'|'updatedAt'>;

@Injectable({
  providedIn: 'root'
})
export class PacientesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService); // Inyectamos el servicio de autenticación

  private readonly useMock = false; // <- deja en false porque ya conectaste backend
  //private readonly baseUrl = 'http://localhost:3000';
  private readonly baseUrl = 'https://odonto-clinic.onrender.com';
  private readonly STORAGE_KEY = 'dentalpro_pacientes_v1';

  /** ⬇️ Mientras no hay login/JWT, usa el usuario creado por Postman */
  private readonly CREATOR_ID = 1;

  // Nuevo método para verificar si un paciente tiene citas
  checkHasCitas(id: string): Observable<boolean> {
    return this.http.get<any[]>(`${this.baseUrl}/citas`).pipe(
      map(citas => citas.some(cita => String(cita.pacienteId) === id))
    );
  }
}
  // ================= Helpers (mapeo FE -> BE) ================= 