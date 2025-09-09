export class CreateUsuarioDto {
	nombre: string;
	email: string;
	password: string;
	rol?: 'ADMIN' | 'DOCTOR' | 'RECEPCIONISTA';
}
