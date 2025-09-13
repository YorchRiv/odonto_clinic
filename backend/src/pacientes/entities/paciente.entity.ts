export class Paciente {
	id: number;
	nombre: string;
	apellido: string;
	identificacion: string;
	telefono?: string;
	email?: string;
	direccion?: string;
	fechaNacimiento?: Date | string;
	ultimaVisita?: Date | string;
	estado?: 'ACTIVO' | 'INACTIVO';
	alergias?: string;
	creadoPorId: number;
	creadoEn?: Date | string;
	actualizadoEn?: Date | string;
}
