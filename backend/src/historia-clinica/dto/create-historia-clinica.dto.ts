export class CreateHistoriaClinicaDto {
	citaId: number;
	pacienteId: number;
	descripcion: string;
	diagnostico?: string;
	tratamiento?: string;
	observaciones?: string;
}
