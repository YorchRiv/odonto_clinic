import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, delay, map } from 'rxjs';
import { AuthService } from '../core/auth.service';

export type PacienteEstado = 'ACTIVO' | 'INACTIVO';

export interface Paciente {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  estado: PacienteEstado;
  alergias?: string | null;
  /** UI: 'dd-MM-yyyy' */
  fechaNacimiento?: string | null;
  dpi?: string | null;

  creadoPorId?: string; // ID del usuario que creó el paciente
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
}

export type PacienteCreate = Omit<Paciente, 'id'|'createdAt'|'updatedAt'>;

@Injectable({
  providedIn: 'root'
})
export class PacientesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService); // Inyectamos el servicio de autenticación

  private readonly useMock = false; // <- deja en false porque ya conectaste backend
  //private readonly baseUrl = 'http://localhost:3000';
  private readonly baseUrl = 'https://odonto-clinic.onrender.com';
  private readonly STORAGE_KEY = 'dentalpro_pacientes_v1';

  /** ⬇️ Mientras no hay login/JWT, usa el usuario creado por Postman */
  private readonly CREATOR_ID = 1;

  // ================= Helpers (mapeo FE -> BE) =================
  /** 'dd-MM-yyyy' o 'dd/MM/yyyy' -> ISO; si ya es ISO, lo deja igual */
  private toISO(d?: string | null): string | null {
    if (!d) return null;
    if (/^\d{4}-\d{2}-\d{2}T/.test(d)) return d; // ya viene ISO
    const [dd, mm, yyyy] = d.replaceAll('/', '-').split('-');
    if (dd && mm && yyyy) return new Date(+yyyy, +mm - 1, +dd).toISOString();
    const t = Date.parse(d);
    return isNaN(t) ? null : new Date(t).toISOString();
  }

  /** ISO -> 'dd-MM-yyyy' (para mostrar si lo quieres así en UI) */
  private toDDMMYYYY(iso?: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  /** 'Activo'/'INACTIVO' -> 'ACTIVO'|'INACTIVO' */
  private normEstado(e?: string | null): PacienteEstado {
    const v = (e ?? '').toString().trim().toUpperCase();
    return v === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';
  }

  /** Elimina keys con undefined para PATCH limpio */
  private pruneUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: any = {};
    Object.keys(obj).forEach(k => {
      if (typeof obj[k] !== 'undefined') out[k] = obj[k];
    });
    return out;
  }

  /** transforma la fila del backend -> modelo del Front */
  private transformPacienteRow = (r: any): Paciente => ({
    id: String(r?.id ?? ''),
    nombres: r?.nombres ?? '',
    apellidos: r?.apellidos ?? '',
    telefono: r?.telefono ?? '',
    email: r?.email ?? null,
    direccion: r?.direccion ?? null,
    estado: this.normEstado(r?.estado),
    alergias: r?.alergias ?? null,

    // Si el backend manda fechaNacimiento como timestamp/ISO, lo transformamos a 'dd-MM-yyyy'
    fechaNacimiento: r?.fechaNacimiento ? this.toDDMMYYYY(String(r.fechaNacimiento)) : null,

    dpi: r?.dpi ?? null,

    creadoPorId: r?.creadoPorId ?? null, // Mapeamos el campo creadoPorId

    // FIX: backend usa creadoEn/actualizadoEn -> front usa createdAt/updatedAt
    createdAt: r?.creadoEn ? String(r.creadoEn) : (r?.createdAt ? String(r.createdAt) : undefined),
    updatedAt: r?.actualizadoEn ? String(r.actualizadoEn) : (r?.updatedAt ? String(r.updatedAt) : undefined),
  });

  /** Construye payload para el backend desde el modelo del FE */
  private mapToApi(p: Partial<Paciente>) {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Usuario no logueado');
    }

    let creadoPorId: string | number = currentUser.id;
    if (currentUser.rol === 'RECEPCIONISTA' && typeof currentUser.refreshToken === 'string') {
      // Si es recepcionista, el creadoPorId debe ser el id del doctor asignado (como número)
      creadoPorId = parseInt(currentUser.refreshToken, 10);
      console.log('[PACIENTES] recepcionista, refreshToken:', currentUser.refreshToken, '-> creadoPorId:', creadoPorId);
    } else {
      console.log('[PACIENTES] usuario:', currentUser.id, 'rol:', currentUser.rol, '-> creadoPorId:', creadoPorId);
    }

    const body = {
      nombres: p.nombres?.trim(),
      apellidos: p.apellidos?.trim(),
      dpi: p.dpi?.trim(),
      telefono: (p.telefono ?? '').toString().trim(),
      email: p.email?.trim() ?? null,
      direccion: p.direccion?.trim() ?? null,
      fechaNacimiento: this.toISO(p.fechaNacimiento ?? null),
      estado: this.normEstado(p.estado),
      alergias: p.alergias?.trim() ?? null,
      creadoPorId,
    };
    return this.pruneUndefined(body);
  }

  // =============== API Pública (con backend real) ===============
  list(): Observable<Paciente[]> {
    if (this.useMock) return this.mock_list().pipe(delay(80));

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Usuario no logueado');
    }

    return this.http.get<any[]>(`${this.baseUrl}/pacientes`).pipe(
      map(rows => {
        const pacientes = (rows ?? []).map(this.transformPacienteRow);
        if (currentUser.rol === 'RECEPCIONISTA' && typeof currentUser.refreshToken === 'string') {
          // El id del doctor asignado está en refreshToken (como string)
          const doctorId = String(parseInt(currentUser.refreshToken, 10));
          // Mostrar pacientes creados por el doctor relacionado o por la propia recepcionista
          return pacientes.filter(p => String(p.creadoPorId) === doctorId || String(p.creadoPorId) === String(currentUser.id));
        }
        // ADMIN y DOCTOR ven los pacientes que crearon
        return pacientes.filter(p => String(p.creadoPorId) === String(currentUser.id));
      })
    );
  }

  getById(id: string): Observable<Paciente | null> {
    if (this.useMock) return this.mock_getById(id).pipe(delay(60));
    return this.http.get<any>(`${this.baseUrl}/pacientes/${id}`).pipe(
      map(row => (row ? this.transformPacienteRow(row) : null))
    );
  }

  create(payload: PacienteCreate): Observable<Paciente> {
    if (this.useMock) return this.mock_create(payload).pipe(delay(120));
    const body = this.mapToApi(payload);
    return this.http.post<Paciente>(`${this.baseUrl}/pacientes`, body);
  }

  update(id: string, changes: Partial<Paciente>): Observable<Paciente> {
    if (this.useMock) return this.mock_update(id, changes).pipe(delay(120));
    const body = this.mapToApi(changes);
    // Tu backend expone PATCH (no PUT)
    return this.http.patch<Paciente>(`${this.baseUrl}/pacientes/${id}`, body);
  }

  delete(id: string): Observable<boolean> {
    if (this.useMock) return this.mock_delete(id).pipe(delay(80));
    return this.http.delete(`${this.baseUrl}/pacientes/${id}`, { observe: 'response' }).pipe(
      map(res => res.ok)
    );
  }

  clearMock(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // ============================= MOCK (localStorage) ============================
  private readStore(): Paciente[] {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private writeStore(arr: Paciente[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(arr));
  }

  private uuid(): string {
    return (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  }

  private norm(str?: string | null): string {
    return (str ?? '').trim().toLowerCase();
  }

  private mock_list(): Observable<Paciente[]> {
    const all = this.readStore();
    // Orden alfabético por apellido, luego nombre
    all.sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`));
    return of(all);
  }

  private mock_getById(id: string): Observable<Paciente | null> {
    const all = this.readStore();
    const p = all.find(x => x.id === id) ?? null;
    return of(p);
  }

  /** Valida que no exista un paciente con el mismo nombre y apellido */
  private validateNombreApellidoUnique(all: Paciente[], nombres: string, apellidos: string, ignoreId?: string) {
    const nomNorm = this.norm(nombres);
    const apeNorm = this.norm(apellidos);
    if (!nomNorm || !apeNorm) return;
    const exists = all.some(p =>
      this.norm(p.nombres) === nomNorm &&
      this.norm(p.apellidos) === apeNorm &&
      (!ignoreId || p.id !== ignoreId)
    );
    if (exists) throw new Error('PACIENTE_DUPLICADO');
  }

  private mock_create(payload: PacienteCreate): Observable<Paciente> {
    try {
      const all = this.readStore();
      this.validateNombreApellidoUnique(all, payload.nombres, payload.apellidos);

      const nowISO = new Date().toISOString();
      const nuevo: Paciente = {
        id: this.uuid(),
        nombres: payload.nombres.trim(),
        apellidos: payload.apellidos.trim(),
        telefono: payload.telefono.trim(),
        email: payload.email?.trim() || null,
        direccion: payload.direccion?.trim() || null,
        estado: payload.estado ?? 'ACTIVO',
        alergias: payload.alergias?.trim() || null,
        fechaNacimiento: payload.fechaNacimiento || null,
        dpi: payload.dpi?.trim() || null,
        createdAt: nowISO,
        updatedAt: nowISO,
      };

      all.push(nuevo);
      this.writeStore(all);
      return of(nuevo);
    } catch (error) {
      return throwError(() => error);
    }
  }

  private mock_update(id: string, changes: Partial<Paciente>): Observable<Paciente> {
    try {
      const all = this.readStore();
      const idx = all.findIndex(p => p.id === id);
      if (idx < 0) return throwError(() => new Error('NO_ENCONTRADO'));

      // Validar nombre y apellido único si se pretende cambiar
      const nombres = typeof changes.nombres !== 'undefined' ? changes.nombres : all[idx].nombres;
      const apellidos = typeof changes.apellidos !== 'undefined' ? changes.apellidos : all[idx].apellidos;
      this.validateNombreApellidoUnique(all, nombres, apellidos, id);

      const updated: Paciente = {
        ...all[idx],
        ...changes,
        nombres: typeof changes.nombres !== 'undefined' ? changes.nombres.trim() : all[idx].nombres,
        apellidos: typeof changes.apellidos !== 'undefined' ? changes.apellidos.trim() : all[idx].apellidos,
        telefono: typeof changes.telefono !== 'undefined' ? changes.telefono.trim() : all[idx].telefono,
        email: typeof changes.email !== 'undefined' ? (changes.email?.trim() || null) : all[idx].email,
        direccion: typeof changes.direccion !== 'undefined' ? (changes.direccion?.trim() || null) : all[idx].direccion,
        alergias: typeof changes.alergias !== 'undefined' ? (changes.alergias?.trim() || null) : all[idx].alergias,
        dpi: typeof changes.dpi !== 'undefined' ? (changes.dpi?.trim() || null) : all[idx].dpi,
        updatedAt: new Date().toISOString(),
      };

      all[idx] = updated;
      this.writeStore(all);
      return of(updated);
    } catch (error) {
      return throwError(() => error);
    }
  }

  private mock_delete(id: string): Observable<boolean> {
    const all = this.readStore();
    const filtered = all.filter(p => p.id !== id);
    const changed = filtered.length !== all.length;
    if (changed) this.writeStore(filtered);
    return of(changed);
  }
}
