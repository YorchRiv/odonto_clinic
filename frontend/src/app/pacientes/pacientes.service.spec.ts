import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PacientesService } from './pacientes.service';

describe('PacientesService', () => {
  let service: PacientesService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PacientesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
