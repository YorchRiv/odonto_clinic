import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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
}