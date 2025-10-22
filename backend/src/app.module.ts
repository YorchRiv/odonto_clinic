import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { CitasModule } from './citas/citas.module';
import { HistoriaClinicaModule } from './historia-clinica/historia-clinica.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [UsuariosModule, PacientesModule, CitasModule, HistoriaClinicaModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
