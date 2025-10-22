import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.usuario.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        nombre: registerDto.nombre,
        apellido: registerDto.apellido,
        rol: registerDto.rol as 'ADMIN' | 'DOCTOR' | 'RECEPCIONISTA',
      },
    });

    const { password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.prisma.usuario.findUnique({
        where: { email: loginDto.email },
      });

      if (!user) {
        throw new UnauthorizedException('El correo electrónico no está registrado');
      }

      if (!user.activo) {
        throw new UnauthorizedException('Tu cuenta está desactivada. Por favor, contacta al administrador');
      }

      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('La contraseña es incorrecta');
      }

      const payload = { 
        email: user.email, 
        sub: user.id, 
        rol: user.rol,
        nombre: user.nombre,
        apellido: user.apellido
      };
      
      const token = this.jwtService.sign(payload, {
        expiresIn: '24h' // El token expira en 24 horas
      });

      return {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          rol: user.rol,
        },
        message: 'Inicio de sesión exitoso'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error en el inicio de sesión. Por favor, intenta nuevamente');
    }
  }

  async validateUser(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
      },
    });
  }

  async updateUser(userId: number, updateUserDto: UpdateUserDto) {
    // Verificar si el usuario existe
    const userExists = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Si se está actualizando el email, verificar que no exista
    if (updateUserDto.email) {
      const existingUser = await this.prisma.usuario.findFirst({
        where: { 
          AND: [
            { email: updateUserDto.email },
            { id: { not: userId } }
          ]
        },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado por otro usuario');
      }
    }

    // Preparar los datos para actualizar
    const updateData: any = {};

    // Solo incluir los campos que se proporcionaron
    if (updateUserDto.email) updateData.email = updateUserDto.email;
    if (updateUserDto.nombre) updateData.nombre = updateUserDto.nombre;
    if (updateUserDto.apellido) updateData.apellido = updateUserDto.apellido;
    if (updateUserDto.rol) updateData.rol = updateUserDto.rol;
    
    // Si hay una nueva contraseña, hashearla
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    try {
      // Realizar la actualización
      const updatedUser = await this.prisma.usuario.update({
        where: { 
          id: userId 
        },
        data: updateData,
      });

      // Remover la contraseña del resultado
      const { password, ...result } = updatedUser;
      return result;
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw new ConflictException('Error al actualizar el usuario');
    }
  }
}