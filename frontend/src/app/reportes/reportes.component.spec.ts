import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ReportesComponent } from './reportes.component';

describe('ReportesComponent', () => {
  let component: ReportesComponent;
  let fixture: ComponentFixture<ReportesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    localStorage.setItem('user', JSON.stringify({ access_token: 'test-token', user: { id: 1, rol: 'ADMIN' } }));
    fixture = TestBed.createComponent(ReportesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
