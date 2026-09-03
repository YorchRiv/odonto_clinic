import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService, LoggedUser } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isLoginRoute = false;
  currentUser: LoggedUser | null = null;
  sidebarOpen = false;
  userMenuOpen = false;

  private router = inject(Router);
  private auth = inject(AuthService);

  constructor() {
    this.syncRouteState();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.syncRouteState());
  }

  get isAdmin(): boolean { return this.currentUser?.rol === 'ADMIN'; }

  get initials(): string {
    const first = this.currentUser?.nombre?.[0] ?? '';
    const last = this.currentUser?.apellido?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'OC';
  }

  get roleLabel(): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrador',
      DOCTOR: 'Doctor',
      RECEPCIONISTA: 'Recepcionista'
    };
    return labels[this.currentUser?.rol ?? ''] ?? 'Usuario';
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar(): void { this.sidebarOpen = false; }
  toggleUserMenu(event: MouseEvent): void { event.stopPropagation(); this.userMenuOpen = !this.userMenuOpen; }

  @HostListener('document:click')
  closeMenus(): void { this.userMenuOpen = false; }

  logout(): void { this.userMenuOpen = false; this.auth.logout(); }

  private syncRouteState(): void {
    this.isLoginRoute = this.router.url.startsWith('/login');
    this.currentUser = this.auth.getCurrentUser();
    this.sidebarOpen = false;
  }
}

