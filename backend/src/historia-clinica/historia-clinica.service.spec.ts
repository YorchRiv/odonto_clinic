import { Test, TestingModule } from '@nestjs/testing';
import { HistoriaClinicaService } from './historia-clinica.service';

describe('HistoriaClinicaService', () => {
  let service: HistoriaClinicaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HistoriaClinicaService],
    }).compile();

    service = module.get<HistoriaClinicaService>(HistoriaClinicaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
