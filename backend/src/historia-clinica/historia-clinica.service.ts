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
    });
  }

  findAll() {
    return this.prisma.historiaClinica.findMany({      
    });
  }

  findOne(id: number) {
    return this.prisma.historiaClinica.findUnique({
      where: { id },      
    });
  }

  update(id: number, updateHistoriaClinicaDto: UpdateHistoriaClinicaDto) {
    return this.prisma.historiaClinica.update({
      where: { id },
      data: updateHistoriaClinicaDto,      
    });
  }

  remove(id: number) {
    return this.prisma.historiaClinica.delete({
      where: { id },
    });
  }
}
