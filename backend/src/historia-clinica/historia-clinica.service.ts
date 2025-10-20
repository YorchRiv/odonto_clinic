import { Injectable } from '@nestjs/common';
import { CreateHistoriaClinicaDto } from './dto/create-historia-clinica.dto';
import { UpdateHistoriaClinicaDto } from './dto/update-historia-clinica.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoriaClinicaService {
  constructor(private prisma: PrismaService) {}

  create(createHistoriaClinicaDto: CreateHistoriaClinicaDto) {
    return this.prisma.historiaClinica.create({
      data: createHistoriaClinicaDto,
      include: {
        cita: true,
        paciente: true,
      },
    });
  }

  findAll() {
    return this.prisma.historiaClinica.findMany({
      include: {
        cita: true,
        paciente: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.historiaClinica.findUnique({
      where: { id },
      include: {
        cita: true,
        paciente: true,
      },
    });
  }

  update(id: number, updateHistoriaClinicaDto: UpdateHistoriaClinicaDto) {
    return this.prisma.historiaClinica.update({
      where: { id },
      data: updateHistoriaClinicaDto,
      include: {
        cita: true,
        paciente: true,
      },
    });
  }

  remove(id: number) {
    return this.prisma.historiaClinica.delete({
      where: { id },
    });
  }
}
