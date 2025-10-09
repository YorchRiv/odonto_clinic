import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, delay } from 'rxjs';

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
  fechaNacimiento?: string | null; // 'yyyy-MM-dd'
  dpi?: string | null;
  ultimaVisita?: string | null;    // 'dd-MM-yyyy'
  createdAt?: string;              // ISO
  updatedAt?: string;              // ISO
}

export type PacienteCreate = Omit<Paciente, 'id'|'estado'|'createdAt'|'updatedAt'|'ultimaVisita'> & {
  estado?: PacienteEstado;
};

@Injectable({ providedIn: 'root' })
export class PacientesService {
  private http = inject(HttpClient);

  // Cambia a false cuando conectes el backend.
  private readonly useMock = true;
  private readonly baseUrl = 'http://localhost:3000';
  private readonly STORAGE_KEY = 'dentalpro_pacientes_v1';

  // =============== API Pública (misma forma que usaría backend) ===============

  list(): Observable<Paciente[]> {
    if (this.useMock) return this.mock_list().pipe(delay(80));
    return this.http.get<Paciente[]>(`${this.baseUrl}/pacientes`);
  }

  getById(id: string): Observable<Paciente | null> {
    if (this.useMock) return this.mock_getById(id).pipe(delay(60));
    return this.http.get<Paciente>(`${this.baseUrl}/pacientes/${id}`);
  }

  create(payload: PacienteCreate): Observable<Paciente> {
    if (this.useMock) return this.mock_create(payload).pipe(delay(120));
    return this.http.post<Paciente>(`${this.baseUrl}/pacientes`, payload);
  }

  update(id: string, changes: Partial<Paciente>): Observable<Paciente> {
    if (this.useMock) return this.mock_update(id, changes).pipe(delay(120));
    return this.http.patch<Paciente>(`${this.baseUrl}/pacientes/${id}`, changes);
  }

  delete(id: string): Observable<boolean> {
    if (this.useMock) return this.mock_delete(id).pipe(delay(80));
    return this.http.delete<boolean>(`${this.baseUrl}/pacientes/${id}`);
  }

  clearMock(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // ============================= MOCK (localStorage) ============================

  private readStore(): Paciente[] {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'); }
    catch { return []; }
  }

  private writeStore(arr: Paciente[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(arr));
  }

  private uuid(): string {
    return (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  }

  private norm(str?: string | null): string {
    return (str ?? '').trim();
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

  /** Valida DPI duplicado (si viene informado) */
  private validateDPIUnique(all: Paciente[], dpi?: string | null, ignoreId?: string) {
    const d = this.norm(dpi);
    if (!d) return;
    const exists = all.some(p => this.norm(p.dpi) === d && (!ignoreId || p.id !== ignoreId));
    if (exists) throw new Error('DPI_DUPLICADO');
  }

  private mock_create(payload: PacienteCreate): Observable<Paciente> {
    const all = this.readStore();
    this.validateDPIUnique(all, payload.dpi);

    const nowISO = new Date().toISOString();
    const nuevo: Paciente = {
      id: this.uuid(),
      nombres: this.norm(payload.nombres),
      apellidos: this.norm(payload.apellidos),
      telefono: this.norm(payload.telefono),
      email: this.norm(payload.email || '') || null,
      direccion: this.norm(payload.direccion || '') || null,
      estado: payload.estado ?? 'ACTIVO',
      alergias: this.norm(payload.alergias || '') || null,
      fechaNacimiento: payload.fechaNacimiento || null,
      dpi: this.norm(payload.dpi || '') || null,
      ultimaVisita: null,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    all.push(nuevo);
    this.writeStore(all);
    return of(nuevo);
  }

  private mock_update(id: string, changes: Partial<Paciente>): Observable<Paciente> {
    const all = this.readStore();
    const idx = all.findIndex(p => p.id === id);
    if (idx < 0) return throwError(() => new Error('NO_ENCONTRADO'));

    // Validar DPI único si se pretende cambiar
    if (typeof changes.dpi !== 'undefined') {
      this.validateDPIUnique(all, changes.dpi, id);
    }

    const updated: Paciente = {
      ...all[idx],
      ...changes,
      nombres: typeof changes.nombres !== 'undefined' ? this.norm(changes.nombres) : all[idx].nombres,
      apellidos: typeof changes.apellidos !== 'undefined' ? this.norm(changes.apellidos) : all[idx].apellidos,
      telefono: typeof changes.telefono !== 'undefined' ? this.norm(changes.telefono) : all[idx].telefono,
      email: typeof changes.email !== 'undefined' ? (this.norm(changes.email || '') || null) : all[idx].email,
      direccion: typeof changes.direccion !== 'undefined' ? (this.norm(changes.direccion || '') || null) : all[idx].direccion,
      alergias: typeof changes.alergias !== 'undefined' ? (this.norm(changes.alergias || '') || null) : all[idx].alergias,
      dpi: typeof changes.dpi !== 'undefined' ? (this.norm(changes.dpi || '') || null) : all[idx].dpi,
      updatedAt: new Date().toISOString(),
    };

    all[idx] = updated;
    this.writeStore(all);
    return of(updated);
  }

  private mock_delete(id: string): Observable<boolean> {
    const all = this.readStore();
    const filtered = all.filter(p => p.id !== id);
    const changed = filtered.length !== all.length;
    if (changed) this.writeStore(filtered);
    return of(changed);
  }
}
