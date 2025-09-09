import { Injectable } from '@nestjs/common';
import { CreateHistoriaClinicaDto } from './dto/create-historia-clinica.dto';
import { UpdateHistoriaClinicaDto } from './dto/update-historia-clinica.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoriaClinicaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createHistoriaClinicaDto: CreateHistoriaClinicaDto) {
    return this.prisma.historiaClinica.create({
      data: createHistoriaClinicaDto,
    });
  }

  async findAll() {
    return this.prisma.historiaClinica.findMany();
  }

  async findOne(id: number) {
    return this.prisma.historiaClinica.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateHistoriaClinicaDto: UpdateHistoriaClinicaDto) {
    return this.prisma.historiaClinica.update({
      where: { id },
      data: updateHistoriaClinicaDto,
    });
  }

  async remove(id: number) {
    return this.prisma.historiaClinica.delete({
      where: { id },
    });
  }
}
