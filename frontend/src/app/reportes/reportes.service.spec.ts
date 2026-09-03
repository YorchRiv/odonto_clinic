import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ReportesService } from './reportes.service';

describe('ReportesService', () => {
  let service: ReportesService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReportesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
