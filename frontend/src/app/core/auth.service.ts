import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface LoginResponse {
  access_token: string;
  user?: any; // ajusta si tu API devuelve más campos
}

interface LoggedUser {
  id: string;
  // Otros campos relevantes del usuario logueado
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  //private readonly baseUrl = 'https://odonto-clinic.onrender.com';
  private readonly baseUrl = 'http://localhost:3000';

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          // Guarda EXACTAMENTE esto para que el interceptor lea access_token
          localStorage.setItem('user', JSON.stringify(res));
        })
      );
  }

  logout(): void {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const raw = localStorage.getItem('user');
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return !!parsed?.access_token;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.access_token ?? null;
    } catch {
      return null;
    }
  }

  getCurrentUser(): LoggedUser | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.user ?? null;
    } catch {
      return null;
    }
  }
}
