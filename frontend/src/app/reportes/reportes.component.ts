import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ReportesService, ReporteFiltro } from './reportes.service';
import { PacientesService, Paciente } from '../pacientes/pacientes.service';

type Tab = 'PACIENTES' | 'CITAS' | 'CLINICOS';
type EstadoUI = 'TODAS' | 'NUEVA' | 'PENDIENTE' | 'CONFIRMADA' | 'FINALIZADA' | 'CANCELADA';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css'],
})
export class ReportesComponent implements OnInit {
  private srv = inject(ReportesService);
  private pacSvc = inject(PacientesService);

  // ===== Tabs y subtipos =====
  tab = signal<Tab>('PACIENTES');
  repPac = signal<'GENERAL' | 'INDIVIDUAL'>('GENERAL');
  repCitas = signal<'DIARIO' | 'SEMANAL' | 'MENSUAL'>('DIARIO');
  // Clínicos: solo historial individual
  repClin = signal<'HISTORIAL_INDIVIDUAL'>('HISTORIAL_INDIVIDUAL');

  // ===== Filtros =====
  fechaDesde = signal<string>('');
  fechaHasta = signal<string>('');
  estadoCita = signal<EstadoUI>('TODAS');

  pacienteQuery = signal<string>('');
  pacienteSelId = signal<string | null>(null);
  showSugerencias = signal<boolean>(false);

  // ===== Datos base =====
  pacientes = signal<Paciente[]>([]);

  // ===== Resultados =====
  cargando = signal<boolean>(false);
  columnas = signal<string[]>([]);
  filas = signal<any[]>([]);
  tituloReporte = signal<string>('Vista previa');

  // ===== Ciclo de vida =====
  ngOnInit(): void {
    this.pacSvc.list().subscribe(arr => this.pacientes.set(arr));

    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    const fecha = `${y}-${m}-${d}`;
    this.fechaDesde.set(fecha);
    this.fechaHasta.set(fecha);
  }

  // ===== Autocomplete paciente =====
  get sugerencias() {
    const q = this.pacienteQuery().trim().toLowerCase();
    if (!q) return [];
    return this.pacientes()
      .filter(p =>
        `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q) ||
        (p.telefono ?? '').toLowerCase().includes(q) ||
        (p.dpi ?? '').toLowerCase().includes(q)
      )
      .slice(0, 10);
  }
  onPacienteInput(val: string) { this.pacienteQuery.set(val); this.pacienteSelId.set(null); this.showSugerencias.set(!!val.trim()); }
  selectPaciente(p: Paciente) { this.pacienteQuery.set(`${p.nombres} ${p.apellidos}`); this.pacienteSelId.set(p.id); this.showSugerencias.set(false); }
  blurPaciente() { setTimeout(() => this.showSugerencias.set(false), 180); }

  // ===== Generar =====
  generar() {
    this.cargando.set(true);
    this.columnas.set([]);
    this.filas.set([]);

    const filtro: ReporteFiltro = {
      tipo: this.tab(),
      subtipo:
        this.tab() === 'PACIENTES' ? this.repPac() :
        this.tab() === 'CITAS'     ? this.repCitas() :
                                     this.repClin(),
      desde: this.fechaDesde(),
      // En MENSUAL el servicio ignora "hasta" y usa todo el mes
      hasta: this.fechaHasta(),
      estado: this.estadoCita(),
      pacienteId: this.pacienteSelId() ?? undefined,
    };

    this.srv.generarReporte(filtro).subscribe({
      next: res => { this.tituloReporte.set(res.titulo); this.columnas.set(res.columnas); this.filas.set(res.filas); this.cargando.set(false); },
      error: ()  => { this.tituloReporte.set('Error al generar el reporte'); this.cargando.set(false); }
    });
  }

  // ===== Export CSV =====
  exportCSV() {
    const cols = this.columnas(); const rows = this.filas(); if (!cols.length) return;
    const esc = (v: any) => `"${(v ?? '').toString().replace(/"/g, '""')}"`;
    const head = cols.map(esc).join(',');
    const body = rows.map(r => cols.map(c => esc(r[c])).join(',')).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${this.slug(this.tituloReporte())}.csv`);
  }

  // ===== Export Excel =====
  async exportExcel() {
    const cols = this.columnas(); const rows = this.filas(); if (!cols.length) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Reporte');
    ws.addRow(cols);
    rows.forEach(r => ws.addRow(cols.map(c => r[c] ?? '')));
    ws.getRow(1).font = { bold: true };
    ws.columns?.forEach(c => c.width = 18);
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${this.slug(this.tituloReporte())}.xlsx`
    );
  }

  // ===== Export PDF (con jspdf-autotable) =====
  exportPDF() {
    const cols = this.columnas(); const rows = this.filas(); if (!cols.length) return;

    // Forzar un ancho pequeño para la columna ID (~8 dígitos)
    const idIndex = cols.findIndex(c => c.toLowerCase() === 'id');
    const landscape = cols.length > 7;
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' });
    const margin = 36; const title = this.tituloReporte();

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(title, margin, margin);

    const columnStyles: Record<number, any> = {};
    if (idIndex >= 0) columnStyles[idIndex] = { cellWidth: 50 };

    autoTable(doc, {
      startY: margin + 10,
      head: [cols],
      body: rows.map(r => cols.map(c => (r[c] ?? '').toString())),
      margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak', valign: 'top', lineWidth: 0.2 },
      headStyles: { fillColor: [247, 241, 255], textColor: 20, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles,
      didDrawPage: (data) => {
        if (data.pageNumber > 1) { doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(title, margin, margin); }
        const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text(`Página ${data.pageNumber}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
      },
    });

    doc.save(`${this.slug(title)}.pdf`);
  }

  // ===== Utils =====
  private slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
}
