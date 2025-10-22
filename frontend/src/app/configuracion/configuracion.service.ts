import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, throwError, map } from 'rxjs';

/** ===== Tipos ===== */
export type Rol = 'ADMIN' | 'DOCTOR' | 'RECEPCIONISTA';

export interface Usuario {
  id: string;            // lo manejamos como string en FE para consistencia
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  creadoEn?: string;     // ISO
  actualizadoEn?: string;// ISO
}

export type UsuarioCreate = {
  nombre: string;
  apellido: string;
  email: string;
  password: string; // requerido al crear
  rol: Rol;
};

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);

  private readonly useMock = false;
  //private readonly baseUrl = 'http://localhost:3000';
  private readonly baseUrl = 'https://odonto-clinic.onrender.com';
  private readonly STORAGE_KEY = 'dentalpro_usuarios_v1';

  // ========= Helpers (map FE -> API y utilidades) =========
  /** Back-end espera números; si recibimos string lo convertimos */
  private toApiId(id: string | number) {
    return typeof id === 'number' ? id : parseInt(id, 10);
  }

  /** Limpia undefined para PATCH */
  private prune<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: any = {};
    Object.keys(obj).forEach(k => {
      if (typeof obj[k] !== 'undefined') out[k] = obj[k];
    });
    return out;
  }

  private mapToApi(input: Partial<UsuarioCreate & Usuario>) {
    return this.prune({
      nombre: input.nombre?.trim(),
      apellido: input.apellido?.trim(),
      email: input.email?.trim(),
      password: input as any && (input as any).password ? (input as any).password : undefined,
      rol: (input.rol ?? 'RECEPCIONISTA') as Rol,
    });
  }

  // ================= API real =================
  list(): Observable<Usuario[]> {
    if (this.useMock) return this.mock_list().pipe(delay(80));
    return this.http.get<Usuario[]>(`${this.baseUrl}/usuarios`);
  }

  getById(id: string): Observable<Usuario> {
    if (this.useMock) return this.mock_getById(id).pipe(delay(60)) as any;
    return this.http.get<Usuario>(`${this.baseUrl}/usuarios/${id}`);
  }

  create(data: UsuarioCreate): Observable<Usuario> {
    if (this.useMock) return this.mock_create(data).pipe(delay(120));
    const body = this.mapToApi(data);
    return this.http.post<Usuario>(`${this.baseUrl}/auth/register/`, body);
  }

  update(id: string, changes: Partial<UsuarioCreate & Usuario>): Observable<Usuario> {
    if (this.useMock) return this.mock_update(id, changes).pipe(delay(120));
    const body = this.mapToApi(changes);
    // Convertir el ID a número antes de enviarlo
    const numericId = this.toApiId(id);
    return this.http.patch<Usuario>(`${this.baseUrl}/usuarios/${numericId}`, body);
  }

  delete(id: string): Observable<boolean> {
    if (this.useMock) return this.mock_delete(id).pipe(delay(80));
    return this.http.delete(`${this.baseUrl}/usuarios/${id}`, { observe: 'response' }).pipe(
      map(r => r.ok)
    );
  }

  // ================= MOCK (localStorage) =================
  private readStore(): Usuario[] {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  private writeStore(arr: Usuario[]) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(arr)); }
  private uuid() { return (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2); }

  private mock_list(): Observable<Usuario[]> {
    const all = this.readStore().sort((a,b)=> `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
    return of(all);
  }
  private mock_getById(id: string): Observable<Usuario | null> {
    const u = this.readStore().find(x => x.id === id) || null;
    return of(u);
  }
  private mock_create(input: UsuarioCreate): Observable<Usuario> {
    const all = this.readStore();
    if (all.some(u => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
      return throwError(() => new Error('EMAIL_DUPLICADO'));
    }
    const now = new Date().toISOString();
    const nuevo: Usuario = {
      id: this.uuid(),
      nombre: input.nombre.trim(),
      apellido: input.apellido.trim(),
      email: input.email.trim(),
      rol: input.rol,
      creadoEn: now, actualizadoEn: now
    };
    all.push(nuevo); this.writeStore(all);
    return of(nuevo);
  }
  private mock_update(id: string, changes: Partial<UsuarioCreate & Usuario>): Observable<Usuario> {
    const all = this.readStore();
    const idx = all.findIndex(u => u.id === id);
    if (idx < 0) return throwError(() => new Error('NO_ENCONTRADO'));

    if (changes.email && all.some(u => u.email.toLowerCase() === changes.email!.trim().toLowerCase() && u.id !== id)) {
      return throwError(() => new Error('EMAIL_DUPLICADO'));
    }

    const updated: Usuario = {
      ...all[idx],
      ...changes,
      nombre: typeof changes.nombre !== 'undefined' ? changes.nombre!.trim() : all[idx].nombre,
      apellido: typeof changes.apellido !== 'undefined' ? changes.apellido!.trim() : all[idx].apellido,
      email: typeof changes.email !== 'undefined' ? changes.email!.trim() : all[idx].email,
      rol: (changes.rol ?? all[idx].rol) as Rol,
      actualizadoEn: new Date().toISOString()
    };
    all[idx] = updated; this.writeStore(all);
    return of(updated);
  }
  private mock_delete(id: string): Observable<boolean> {
    const all = this.readStore();
    const filtered = all.filter(u => u.id !== id);
    const changed = filtered.length !== all.length;
    if (changed) this.writeStore(filtered);
    return of(changed);
  }
}
