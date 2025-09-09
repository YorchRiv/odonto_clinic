import { Test, TestingModule } from '@nestjs/testing';
import { HistoriaClinicaController } from './historia-clinica.controller';
import { HistoriaClinicaService } from './historia-clinica.service';

describe('HistoriaClinicaController', () => {
  let controller: HistoriaClinicaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoriaClinicaController],
      providers: [HistoriaClinicaService],
    }).compile();

    controller = module.get<HistoriaClinicaController>(HistoriaClinicaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
