import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PacientesModule } from './pacientes/pacientes.module';
import { CitasModule } from './citas/citas.module';
import { HistoriaClinicaModule } from './historia-clinica/historia-clinica.module';
import { ServiciosModule } from './servicios/servicios.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [PacientesModule, CitasModule, HistoriaClinicaModule, ServiciosModule, UsuariosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
