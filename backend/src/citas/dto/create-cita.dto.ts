export class CreateCitaDto {
	pacienteId: number;
	usuarioId: number;
	servicioId: number;
	fecha: Date | string;
	estado?: 'NUEVA' | 'CONFIRMADA' | 'PENDIENTE' | 'CANCELADA' | 'COMPLETADA';
	notas?: string;
}
