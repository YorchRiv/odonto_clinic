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
  fechaNacimiento?: string | null; // 'dd-MM-yyyy'
  dpi?: string | null;
  
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
}

export type PacienteCreate = Omit<Paciente, 'id'|'estado'|'createdAt'|'updatedAt'|'ultimaVisita'> & {
  estado?: PacienteEstado;
};

@Injectable({
  providedIn: 'root'
})
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
      
      // Validar que no exista paciente con mismo nombre y apellido
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