import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HistoriaClinicaComponent } from './historia-clinica.component';

describe('HistoriaClinicaComponent', () => {
  let component: HistoriaClinicaComponent;
  let fixture: ComponentFixture<HistoriaClinicaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriaClinicaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    localStorage.setItem('user', JSON.stringify({ access_token: 'test-token', user: { id: 1, rol: 'ADMIN' } }));
    fixture = TestBed.createComponent(HistoriaClinicaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
