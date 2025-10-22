import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isLoginRoute = false;
  currentUser: any;

  private router = inject(Router);
  private auth = inject(AuthService);

  constructor() {
    // Valor inicial (por si se entra directo a /login)
    this.isLoginRoute = this.router.url.startsWith('/login');
    this.currentUser = this.auth.getCurrentUser();

    // Actualiza en cada navegación
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.isLoginRoute = this.router.url.startsWith('/login');
        this.currentUser = this.auth.getCurrentUser();
      });
  }

  logout(): void {
    this.auth.logout(); // borra token y navega a /login
  }
}
