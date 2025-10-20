import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { CitasModule } from './citas/citas.module';
import { HistoriaClinicaModule } from './historia-clinica/historia-clinica.module';

@Module({
  imports: [UsuariosModule, PacientesModule, CitasModule, HistoriaClinicaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
