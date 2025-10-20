//EN ESTA SECCION SE DEFINEN LAS RUTAS DE LA APLICACION
import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AgendaComponent } 	from './agenda/agenda.component'; // Importa el componente de la agenda primer letra mayuscula y la C
import { PacientesComponent } from './pacientes/pacientes.component'; // Importa el componente de pacientes
import { HistoriaClinicaComponent } from './historia-clinica/historia-clinica.component';
import { ReportesComponent } from './reportes/reportes.component'; // Importa el componente de historia clinica
import { ConfiguracionComponent } from './configuracion/configuracion.component'; // Importa el componente de configuracion

export const routes: Routes = [
	 // raíz -> dashboard
	{
		path: '',
		redirectTo: 'dashboard',
		pathMatch: 'full'
	},
	{
		path: 'dashboard',
		component: DashboardComponent
	},
	{
		path: 'agenda',
		component: AgendaComponent
	},
	{
		path: 'pacientes',
		component: PacientesComponent
	},
	{
		path: 'historia-clinica',
		component: HistoriaClinicaComponent	
	},
	{
		path: 'reportes',
		component: ReportesComponent
	},
	{
		path: 'configuracion',
		component: ConfiguracionComponent
	}
];