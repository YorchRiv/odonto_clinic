import { EstadoPaciente } from '../../common/enums';

export class CreatePacienteDto {
	nombre: string;
	apellido: string;
	identificacion: string;
	telefono?: string;
	email?: string;
	direccion?: string;
	fechaNacimiento?: Date | string;
	ultimaVisita?: Date | string;
	estado?: EstadoPaciente;
	alergias?: string;
	creadoPorId: number;
}
