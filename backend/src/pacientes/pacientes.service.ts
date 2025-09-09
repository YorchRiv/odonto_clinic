import { Injectable } from '@nestjs/common';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PacientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPacienteDto: CreatePacienteDto) {
    return this.prisma.paciente.create({
      data: createPacienteDto,
    });
  }

  async findAll() {
    return this.prisma.paciente.findMany();
  }

  async findOne(id: number) {
    return this.prisma.paciente.findUnique({
      where: { id },
    });
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
