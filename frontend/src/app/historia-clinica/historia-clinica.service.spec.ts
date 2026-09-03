import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { HistoriaClinicaService } from './historia-clinica.service';

describe('HistoriaClinicaService', () => {
  let service: HistoriaClinicaService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(HistoriaClinicaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
