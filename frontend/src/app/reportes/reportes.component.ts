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
    const cols = this.columnas();
    const rows = this.filas();
    if (!cols.length) return;

    const isTextCol = (col: string) =>
      /^(id|tel[eé]fono|dpi)$/i.test(col.trim());

    const sanitizeCell = (raw: any, col: string) => {
      if (raw === null || raw === undefined) return '';
      let s = String(raw);
      s = s.replace(/\r?\n/g, ' ');
      if (s === '—') s = '';
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      if (isTextCol(col)) s = '\t' + s;
      s = s.replace(/"/g, '""');
      return `"${s}"`;
    };

    const head = cols.map(c => sanitizeCell(c, c)).join(',');
    const body = rows
      .map(r => cols.map(c => sanitizeCell(r[c], c)).join(','))
      .join('\r\n');

    const bom = '\uFEFF';
    const csv = bom + head + '\r\n' + body;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
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

  const idIndex = cols.findIndex(c => c.toLowerCase() === 'id');
  const landscape = cols.length > 7;

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' });
  const margin = 36;
  const pageWidth = doc.internal.pageSize.getWidth();

  const titulo = this.tituloReporte();
  const fechaImpresion = this.formatFechaHora(new Date());
  const leyenda = `Impresión: ${fechaImpresion}`;

  // Decisiones de layout del encabezado
  let titleFS = 14;    // tamaño base del título
  let subFS   = 9;     // tamaño base de la leyenda
  const gap   = 10;    // espacio entre título y leyenda en la misma línea
  const maxW  = pageWidth - margin * 2;

  // Medir y decidir si caben en la misma línea
  doc.setFont('helvetica', 'bold');  doc.setFontSize(titleFS);
  let titleW = doc.getTextWidth(titulo);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(subFS);
  let leyendaW = doc.getTextWidth(leyenda);

  // Intento 1: mismo renglón
  let mismaLinea = (titleW + gap + leyendaW) <= maxW;

  // Intento 2: si no cabe, bajar un poco las fuentes y volver a medir
  if (!mismaLinea) {
    titleFS = 12;
    subFS   = 8;
    doc.setFont('helvetica', 'bold');  doc.setFontSize(titleFS);
    titleW = doc.getTextWidth(titulo);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(subFS);
    leyendaW = doc.getTextWidth(leyenda);
    mismaLinea = (titleW + gap + leyendaW) <= maxW;
  }

  // Si aún no cabe, leyenda va en segunda línea
  const leyendaSegundaLinea = !mismaLinea;

  // Dibuja encabezado y devuelve la altura usada
  const drawHeader = () => {
    let y = margin;

    // Título (con posible wrap si es muy largo)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(titleFS);
    const tituloSplit = doc.splitTextToSize(titulo, maxW - (leyendaSegundaLinea ? 0 : leyendaW + gap));
    doc.text(tituloSplit, margin, y);

    if (leyendaSegundaLinea) {
      // Leyenda en segunda línea, alineada a la derecha
      doc.setFont('helvetica', 'normal'); doc.setFontSize(subFS);
      y += 14; // salto a segunda línea del encabezado
      doc.text(leyenda, pageWidth - margin, y, { align: 'right' });
    } else {
      // Misma línea, a la derecha
      doc.setFont('helvetica', 'normal'); doc.setFontSize(subFS);
      doc.text(leyenda, pageWidth - margin, margin, { align: 'right' });
    }

    // Altura total ocupada por el encabezado
    const headerHeight = leyendaSegundaLinea ? 22 : 14;
    return headerHeight;
  };

  const headerHeight = drawHeader();

  const marginTopForTable = margin + headerHeight + 8;

  const columnStyles: Record<number, any> = {};
  if (idIndex >= 0) columnStyles[idIndex] = { cellWidth: 50 };

  autoTable(doc, {
    startY: marginTopForTable,
    head: [cols],
    body: rows.map(r => cols.map(c => (r[c] ?? '').toString())),
    margin: { left: margin, right: margin },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak', valign: 'top', lineWidth: 0.2 },
    headStyles: { fillColor: [247, 241, 255], textColor: 20, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles,
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        // Redibujar encabezado en páginas siguientes con la misma lógica
        drawHeader();
      }
      // Pie de página
      const ph = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(`Página ${data.pageNumber}`, pageWidth - margin, ph - 12, { align: 'right' });
    },
  });

  doc.save(`${this.slug(titulo)}.pdf`);
}



  // ===== Utils =====
  private slug(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // dd/mm/yyyy hh:mm a. m./p. m. (zona local del navegador)
  private formatFechaHora(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dd = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    let hh = d.getHours();
    const min = pad(d.getMinutes());
    const ampm = hh >= 12 ? 'p. m.' : 'a. m.';
    hh = hh % 12; if (hh === 0) hh = 12;
    const hhStr = pad(hh);
    return `${dd}/${mm}/${yyyy} ${hhStr}:${min} ${ampm}`;
  }
}
