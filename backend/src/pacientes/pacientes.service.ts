import { Injectable } from '@nestjs/common';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PacientesService {
  constructor(private prisma: PrismaService) {}

  create(createPacienteDto: CreatePacienteDto) {
    return this.prisma.paciente.create({
      data: createPacienteDto,
    });
  }

  findAll() {
    return this.prisma.paciente.findMany({
      include: {
        creadoPor: true,
        citas: true,
        historias: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.paciente.findUnique({
      where: { id },
      include: {
        creadoPor: true,
        citas: true,
        historias: true,
      },
    });
  }

  update(id: number, updatePacienteDto: UpdatePacienteDto) {
    return this.prisma.paciente.update({
      where: { id },
      data: updatePacienteDto,
    });
  }

  remove(id: number) {
    return this.prisma.paciente.delete({
      where: { id },
    });
  }
}
