import { Injectable } from '@nestjs/common';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PacienteResponse } from './interfaces/paciente-response.interface';

@Injectable()
export class PacientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPacienteDto: CreatePacienteDto) {
    return this.prisma.paciente.create({
      data: createPacienteDto,
    });
  }

  public transformPaciente(paciente: any): PacienteResponse {
    return {
      id: paciente.id.toString(),
      nombres: paciente.nombre,
      apellidos: paciente.apellido,
      telefono: paciente.telefono || '',
      email: paciente.email,
      direccion: paciente.direccion,
      estado: paciente.estado,
      alergias: paciente.alergias,
      fechaNacimiento: paciente.fechaNacimiento 
        ? new Date(paciente.fechaNacimiento).toLocaleDateString('es-GT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).split('/').join('-')
        : null,
      dpi: paciente.identificacion,
      createdAt: paciente.creadoEn?.toISOString(),
      updatedAt: paciente.actualizadoEn?.toISOString(),
    };
  }

  async findAll() {
    const pacientes = await this.prisma.paciente.findMany();
    return pacientes.map(paciente => this.transformPaciente(paciente));
  }

  async findOne(id: number) {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id },
    });
    return paciente ? this.transformPaciente(paciente) : null;
  }

  async update(id: number, updatePacienteDto: UpdatePacienteDto) {
    return this.prisma.paciente.update({
      where: { id },
      data: updatePacienteDto,
    });
  }

  async remove(id: number) {
    return this.prisma.paciente.delete({
      where: { id },
    });
  }
}
