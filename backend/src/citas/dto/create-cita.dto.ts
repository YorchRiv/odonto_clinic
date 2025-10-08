import { EstadoCita } from '../../common/enums';

export class CreateCitaDto {
	pacienteId: number;
	usuarioId: number;
	servicioId: number;
	fechaInicio: Date | string;
	fechaFin: Date | string;
	estado?: EstadoCita;
	notas?: string;
}
