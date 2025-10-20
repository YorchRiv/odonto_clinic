import { Rol } from "@prisma/client";

export class CreateUsuarioDto {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: Rol;
  refreshToken?: string | null; // Para JWT refresh token
  lastLogin?: Date | null;
  activo: boolean;
}
