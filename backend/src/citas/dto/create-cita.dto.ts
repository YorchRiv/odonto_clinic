export class CreateCitaDto {
  pacienteId: number;
  usuarioId: number;
  fecha: Date;
  hora: string;
  motivo: string;
  estado: EstadoCita;
  notas?: string;
}

enum EstadoCita {
  CONFIRMADA = 'CONFIRMADA',
  PENDIENTE = 'PENDIENTE',
  NUEVA = 'NUEVA',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
  DISPONIBLE = 'DISPONIBLE'
}
