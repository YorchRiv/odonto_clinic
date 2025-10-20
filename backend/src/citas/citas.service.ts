import { Injectable } from '@nestjs/common';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CitasService {
  constructor(private prisma: PrismaService) {}

  create(createCitaDto: CreateCitaDto) {
    return this.prisma.cita.create({
      data: createCitaDto,
    });
  }

  findAll() {
    return this.prisma.cita.findMany();
  }

  findOne(id: number) {
    return this.prisma.cita.findUnique({
      where: { id },
    });
  }

  update(id: number, updateCitaDto: UpdateCitaDto) {
    return this.prisma.cita.update({
      where: { id },
      data: updateCitaDto,
    });
  }

  remove(id: number) {
    return this.prisma.cita.delete({
      where: { id },
    });
  }
}
