export class CreateCitaDto {
	pacienteId: number;
	servicioId: number;
	fecha: Date | string;
	estado?: 'NUEVA' | 'CONFIRMADA' | 'PENDIENTE' | 'CANCELADA' | 'COMPLETADA';
	notas?: string;
}
