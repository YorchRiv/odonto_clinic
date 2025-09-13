export class CreatePacienteDto {
	nombre: string;
	identificacion: string;
	telefono?: string;
	email?: string;
	direccion?: string;
	fechaNacimiento?: Date | string;
	ultimaVisita?: Date | string;
	estado?: 'ACTIVO' | 'INACTIVO';
	creadoPorId: number;
}
