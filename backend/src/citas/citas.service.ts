import { Injectable } from '@nestjs/common';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CitasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCitaDto: CreateCitaDto) {
    return this.prisma.cita.create({
      data: createCitaDto,
    });
  }

  async findAll() {
    return this.prisma.cita.findMany();
  }

  async findOne(id: number) {
    return this.prisma.cita.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateCitaDto: UpdateCitaDto) {
    return this.prisma.cita.update({
      where: { id },
      data: updateCitaDto,
    });
  }

  async remove(id: number) {
    return this.prisma.cita.delete({
      where: { id },
    });
  }
}
