import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';

enum Rol {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPCIONISTA = 'RECEPCIONISTA'
}

export { Rol };

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  nombre: string;

  @IsString()
  apellido: string;

  @IsEnum(Rol, { message: 'El rol debe ser ADMIN, DOCTOR o RECEPCIONISTA' })
  rol: Rol;

  // Campo opcional para refreshToken
  @IsString()
  refreshToken?: string | null;
}