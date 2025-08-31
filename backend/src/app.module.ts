import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PacientesModule } from './pacientes/pacientes.module';
import { CitasModule } from './citas/citas.module';
import { PagosModule } from './pagos/pagos.module';

@Module({
  imports: [PacientesModule, CitasModule, PagosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
