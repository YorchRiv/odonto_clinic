import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, delay } from 'rxjs';

/** ===== Tipos de la Agenda ===== */
export type CitaStatus =
  | 'CONFIRMADA'
  | 'PENDIENTE'
  | 'NUEVA'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'DISPONIBLE';

export interface CitaItem {
  id: string;
  hora: string;          // 'HH:MM' (24h)
  pacienteId?: string;   // <-- agregado para enlazar con paciente real
  paciente?: string;
  motivo?: string;
  status: CitaStatus;
  notas?: string;
}

/** fechaISO es la "key" del día en formato dd-MM-yyyy */
export interface AgendaDia {
  fechaISO: string;      // 'dd-MM-yyyy'
  items: CitaItem[];
}

@Injectable({ providedIn: 'root' })
export class AgendaService {
  private http = inject(HttpClient);

  /** Cuando conectes backend: ajusta baseUrl y pon useMock=false */
  private readonly baseUrl = 'http://localhost:3000';
  private readonly useMock = true;

  /** Clave de almacenamiento local para el mock */
  private readonly STORAGE_KEY = 'dentalpro_agenda_v1';

  // ================== API PÚBLICA (misma firma que el backend) ==================

  /** GET /agenda?date=dd-MM-yyyy */
  getAgendaDia(fechaISO: string): Observable<AgendaDia> {
    if (this.useMock) return this.mock_getAgendaDia(fechaISO).pipe(delay(100));
    return this.http.get<AgendaDia>(`${this.baseUrl}/agenda`, { params: { date: fechaISO } });
  }

  /** POST /citas  (requiere paciente existente) */
  crearCita(body: {
    fechaISO: string;
    hora: string;
    pacienteId: string;      // id del paciente existente
    pacienteNombre: string;  // texto a mostrar (UI)
    motivo: string;
    notas?: string;
  }): Observable<CitaItem> {
    if (this.useMock) return this.mock_crearCita(body).pipe(delay(120));
    return this.http.post<CitaItem>(`${this.baseUrl}/citas`, body);
  }

  /** PATCH /citas/:id/status */
  actualizarEstado(id: string, status: CitaStatus, fechaISO: string): Observable<CitaItem> {
    if (this.useMock) return this.mock_actualizarEstado(id, status, fechaISO).pipe(delay(90));
    return this.http.patch<CitaItem>(`${this.baseUrl}/citas/${id}/status`, { status });
  }

  /** PATCH /citas/:id  (editar hora/paciente/motivo/notas y permite CAMBIAR de día) */
  actualizarCita(
    id: string,
    fechaISO: string,
    payload: Partial<Pick<CitaItem, 'hora'|'paciente'|'motivo'|'notas'>>
  ): Observable<CitaItem> {
    if (this.useMock) return this.mock_actualizarCita(id, fechaISO, payload).pipe(delay(120));
    // En backend real, PATCH /citas/:id aceptaría nueva fecha/hora y movería la cita.
    return this.http.patch<CitaItem>(`${this.baseUrl}/citas/${id}`, payload);
  }

  /** DELETE /citas/:id */
  eliminarCita(fechaISO: string, id: string): Observable<boolean> {
    if (this.useMock) return this.mock_eliminarCita(fechaISO, id).pipe(delay(80));
    return this.http.delete<boolean>(`${this.baseUrl}/citas/${id}`);
  }

  /** (Opcional) helper de desarrollo para limpiar el mock */
  clearMock(): void { localStorage.removeItem(this.STORAGE_KEY); }

  // ================== IMPLEMENTACIÓN MOCK (localStorage) ===================

  /** Lee el mapa completo { [fecha dd-MM-yyyy]: CitaItem[] } */
  private readStore(): Record<string, CitaItem[]> {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }
  /** Guarda el mapa */
  private writeStore(map: Record<string, CitaItem[]>) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(map));
  }

  /** Normaliza 'HH:MM:ss' → 'HH:MM' */
  private normHora(h: string): string { return (h ?? '').slice(0, 5); }

  /** Ordena por hora ascendente */
  private sortByHora(items: CitaItem[]): CitaItem[] {
    return [...items].sort((a, b) => a.hora.localeCompare(b.hora));
  }

  /** ¿Existe otra cita ocupando esa hora? (ignora un id en edición) */
  private horaOcupada(items: CitaItem[], hora: string, ignoreId?: string): boolean {
    const target = this.normHora(hora);
    return items.some(c =>
      c.hora === target &&
      c.status !== 'DISPONIBLE' &&
      (!ignoreId || c.id !== ignoreId)
    );
  }

  /** Busca una cita por id en TODO el store */
  private findById(map: Record<string, CitaItem[]>, id: string): { fecha: string; idx: number } | null {
    for (const fecha of Object.keys(map)) {
      const idx = (map[fecha] ?? []).findIndex(c => c.id === id);
      if (idx >= 0) return { fecha, idx };
    }
    return null;
  }

  /** —— GET (mock) ——  NO SIEMBRA DATOS por defecto */
  private mock_getAgendaDia(fechaISO: string): Observable<AgendaDia> {
    const map = this.readStore();
    let items = map[fechaISO];

    if (!items) {
      items = [];
      map[fechaISO] = items;
      this.writeStore(map);
    }

    return of<AgendaDia>({ fechaISO, items: this.sortByHora(items) });
  }

  /** —— CREATE (mock) —— requiere paciente existente */
  private mock_crearCita(body: {
    fechaISO: string;
    hora: string;
    pacienteId: string;
    pacienteNombre: string;
    motivo: string;
    notas?: string;
  }): Observable<CitaItem> {
    const map = this.readStore();
    const items = map[body.fechaISO] ?? [];
    const hora = this.normHora(body.hora);

    if (this.horaOcupada(items, hora)) {
      return throwError(() => new Error('HORARIO_OCUPADO'));
    }

    const id = (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const nueva: CitaItem = {
      id,
      hora,
      pacienteId: body.pacienteId,          // guardamos id de paciente
      paciente: body.pacienteNombre,        // texto a mostrar
      motivo: body.motivo,
      notas: body.notas,
      status: 'NUEVA',
    };

    map[body.fechaISO] = this.sortByHora([...items, nueva]);
    this.writeStore(map);
    return of(nueva);
  }

  /** —— UPDATE STATUS (mock) —— (si no la encuentra en la fecha, busca en todo el store) */
  private mock_actualizarEstado(id: string, status: CitaStatus, fechaISO: string): Observable<CitaItem> {
    const map = this.readStore();
    let items = map[fechaISO] ?? [];
    let idx = items.findIndex(c => c.id === id);

    if (idx < 0) {
      const found = this.findById(map, id);
      if (!found) return throwError(() => new Error('NO_ENCONTRADA'));
      items = map[found.fecha];
      idx = found.idx;
    }

    items[idx] = { ...items[idx], status };
    this.writeStore(map);
    return of(items[idx]);
  }

  /** —— UPDATE (mock) —— permite mover de día y valida choques en el día destino */
  private mock_actualizarCita(
    id: string,
    fechaISO: string,
    payload: Partial<Pick<CitaItem, 'hora'|'paciente'|'motivo'|'notas'>>
  ): Observable<CitaItem> {
    const map = this.readStore();

    const located = this.findById(map, id);
    if (!located) return throwError(() => new Error('NO_ENCONTRADA'));

    const fromFecha = located.fecha;
    const original = map[fromFecha][located.idx];
    const targetFecha = fechaISO; // dd-MM-yyyy de destino

    // Normaliza la hora de destino
    const newHora = payload.hora ? this.normHora(payload.hora) : original.hora;

    // Asegura arreglo destino
    const targetItems = map[targetFecha] ?? (map[targetFecha] = []);

    // Valida choque en el día destino (ignorando este id)
    if (this.horaOcupada(targetItems, newHora, id)) {
      return throwError(() => new Error('HORARIO_OCUPADO'));
    }

    const actualizado: CitaItem = {
      ...original,
      ...payload,
      hora: newHora,
    };

    if (fromFecha === targetFecha) {
      // Misma fecha → solo reemplazar y ordenar
      map[targetFecha][located.idx] = actualizado;
      map[targetFecha] = this.sortByHora(map[targetFecha]);
    } else {
      // Cambió de fecha → remover del día original y agregar al nuevo
      map[fromFecha] = (map[fromFecha] ?? []).filter(c => c.id !== id);
      map[targetFecha] = this.sortByHora([...targetItems, actualizado]);
    }

    this.writeStore(map);
    return of(actualizado);
  }

  /** —— DELETE (mock) —— si no la encuentra en la fecha, busca en todo el store */
  private mock_eliminarCita(fechaISO: string, id: string): Observable<boolean> {
    const map = this.readStore();
    let items = map[fechaISO] ?? [];
    let before = items.length;
    items = items.filter(c => c.id !== id);
    map[fechaISO] = items;

    if (items.length === before) {
      // no estaba en esa fecha → buscar globalmente
      const found = this.findById(map, id);
      if (found) {
        map[found.fecha] = (map[found.fecha] ?? []).filter(c => c.id !== id);
      }
    }

    this.writeStore(map);
    return of(true);
  }
}
