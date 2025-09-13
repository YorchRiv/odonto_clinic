
import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AgendaComponent } 	from './agenda/agenda.component'; // Importa el componente de la agenda primer letra mayuscula y la C

export const routes: Routes = [
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
	}
];