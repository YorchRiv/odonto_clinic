import { Rol } from '../../common/enums';

export class CreateUsuarioDto {
	nombre: string;
	apellido: string;
	email: string;
	password: string;
	rol?: Rol;
}
