import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PacientesComponent } from './pacientes.component';

describe('PacientesComponent', () => {
  let component: PacientesComponent;
  let fixture: ComponentFixture<PacientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PacientesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    localStorage.setItem('user', JSON.stringify({ access_token: 'test-token', user: { id: 1, rol: 'ADMIN' } }));
    fixture = TestBed.createComponent(PacientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
