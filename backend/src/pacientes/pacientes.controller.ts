import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { PacienteResponse } from './interfaces/paciente-response.interface';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPacienteDto: CreatePacienteDto) {
    const paciente = await this.pacientesService.create(createPacienteDto);
    return this.pacientesService.transformPaciente(paciente);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.pacientesService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pacientesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePacienteDto: UpdatePacienteDto,
  ) {
    const paciente = await this.pacientesService.update(id, updatePacienteDto);
    return this.pacientesService.transformPaciente(paciente);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.pacientesService.remove(id);
  }
}
