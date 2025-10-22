import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  ASISTENTE = 'ASISTENTE'
}

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  apellido?: string;

  @IsEnum(UserRole)
  @IsOptional()
  rol?: UserRole;
}