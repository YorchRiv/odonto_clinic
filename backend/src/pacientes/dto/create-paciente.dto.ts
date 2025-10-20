export class CreatePacienteDto {
  nombres: string;
  apellidos: string;
  dpi?: string;
  telefono: string;
  email?: string;
  direccion?: string;
  fechaNacimiento?: Date;
  estado: EstadoPaciente;
  alergias?: string;
  creadoPorId: number;
}

enum EstadoPaciente {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO'
}
