export interface PacienteResponse {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  estado: string;
  alergias?: string | null;
  fechaNacimiento?: string | null;
  dpi?: string | null;
  createdAt?: string;
  updatedAt?: string;
}