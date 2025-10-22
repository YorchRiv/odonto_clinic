// EN ESTA SECCION SE DEFINEN LAS RUTAS DE LA APLICACION
import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AgendaComponent } from './agenda/agenda.component';
import { PacientesComponent } from './pacientes/pacientes.component';
import { HistoriaClinicaComponent } from './historia-clinica/historia-clinica.component';
import { ReportesComponent } from './reportes/reportes.component';
import { ConfiguracionComponent } from './configuracion/configuracion.component';
import { authGuard } from './core/auth.guard';
import { loginGuard } from './core/login.guard';

export const routes: Routes = [
  // Pantalla pública de login (si ya estás logueado, te manda al dashboard)
  {
    path: 'login',
    canMatch: [loginGuard],
    loadComponent: () =>
      import('./auth/login/login.component').then(m => m.LoginComponent),
  },

  // raíz -> dashboard
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Rutas protegidas
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'agenda', component: AgendaComponent, canActivate: [authGuard] },
  { path: 'pacientes', component: PacientesComponent, canActivate: [authGuard] },
  { path: 'historia-clinica', component: HistoriaClinicaComponent, canActivate: [authGuard] },
  { path: 'reportes', component: ReportesComponent, canActivate: [authGuard] },
  { path: 'configuracion', component: ConfiguracionComponent, canActivate: [authGuard] },

  // fallback
  { path: '**', redirectTo: 'dashboard' },
];
