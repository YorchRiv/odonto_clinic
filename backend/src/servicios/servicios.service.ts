import { Injectable } from '@nestjs/common';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createServicioDto: CreateServicioDto) {
    return this.prisma.servicio.create({
      data: createServicioDto,
    });
  }

  async findAll() {
    return this.prisma.servicio.findMany();
  }

  async findOne(id: number) {
    return this.prisma.servicio.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateServicioDto: UpdateServicioDto) {
    return this.prisma.servicio.update({
      where: { id },
      data: updateServicioDto,
    });
  }

  async remove(id: number) {
    return this.prisma.servicio.delete({
      where: { id },
    });
  }
}
