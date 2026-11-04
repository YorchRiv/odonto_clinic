import { chromium } from 'file:///C:/Users/luism/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import path from 'node:path';
import fs from 'node:fs/promises';

const root = process.cwd();
const out = path.join(root, 'manual-usuario', 'capturas');
await fs.mkdir(out, { recursive: true });

const user = {
  id: 1,
  nombre: 'Ana',
  apellido: 'Morales',
  email: 'ana.morales@odontoclinic.test',
  rol: 'ADMIN',
  refreshToken: null,
};

const pacientes = [
  { id: '101', nombres: 'María', apellidos: 'López', telefono: '5555-0101', email: 'maria@example.test', direccion: 'Zona 1, Guatemala', estado: 'ACTIVO', alergias: 'Alergia a la penicilina', fechaNacimiento: '1992-04-16T00:00:00.000Z', dpi: '0000 00000 0101', creadoPorId: 1, creadoEn: '2026-09-12T10:00:00.000Z' },
  { id: '102', nombres: 'Carlos', apellidos: 'Méndez', telefono: '5555-0102', email: 'carlos@example.test', direccion: 'Zona 7, Guatemala', estado: 'ACTIVO', alergias: null, fechaNacimiento: '1985-11-03T00:00:00.000Z', dpi: '0000 00000 0102', creadoPorId: 1, creadoEn: '2026-10-02T10:00:00.000Z' },
  { id: '103', nombres: 'Elena', apellidos: 'Ruiz', telefono: '5555-0103', email: null, direccion: 'Mixco, Guatemala', estado: 'INACTIVO', alergias: null, fechaNacimiento: '1978-07-22T00:00:00.000Z', dpi: '0000 00000 0103', creadoPorId: 1, creadoEn: '2026-08-20T10:00:00.000Z' },
];

const isoAt = (days, hour) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const citas = [
  { id: 201, pacienteId: 101, usuarioId: 1, fecha: isoAt(0, 9), hora: '09:00', motivo: 'Limpieza dental', estado: 'CONFIRMADA', notas: 'Paciente solicita revisión general.' },
  { id: 202, pacienteId: 102, usuarioId: 1, fecha: isoAt(0, 11), hora: '11:00', motivo: 'Evaluación de sensibilidad', estado: 'PENDIENTE', notas: 'Molestia al consumir alimentos fríos.' },
  { id: 203, pacienteId: 101, usuarioId: 1, fecha: isoAt(-14, 15), hora: '15:00', motivo: 'Control odontológico', estado: 'FINALIZADA', notas: 'Control realizado sin novedades.' },
  { id: 204, pacienteId: 103, usuarioId: 1, fecha: isoAt(1, 10), hora: '10:00', motivo: 'Consulta inicial', estado: 'NUEVA', notas: null },
];

const usuarios = [
  { id: '1', nombre: 'Ana', apellido: 'Morales', email: 'ana.morales@odontoclinic.test', rol: 'ADMIN', activo: true },
  { id: '2', nombre: 'Diego', apellido: 'Pérez', email: 'diego.perez@odontoclinic.test', rol: 'DOCTOR', activo: true },
  { id: '3', nombre: 'Laura', apellido: 'Castillo', email: 'laura.castillo@odontoclinic.test', rol: 'RECEPCIONISTA', refreshToken: '2', activo: true },
];

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
});
const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const publicPage = await publicContext.newPage();
await publicPage.goto('http://127.0.0.1:4200/login');
await publicPage.waitForLoadState('networkidle');
await publicPage.screenshot({ path: path.join(out, '01-login.png') });
await publicContext.close();

const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await context.addInitScript(({ user }) => {
  localStorage.setItem('user', JSON.stringify({ access_token: 'captura-local', user }));
}, { user });
const page = await context.newPage();

await page.route('https://odonto-clinic.onrender.com/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname;
  const method = request.method();
  let body = {};
  if (method === 'GET' && pathname === '/pacientes') body = pacientes;
  else if (method === 'GET' && pathname.startsWith('/pacientes/')) body = pacientes.find(p => p.id === pathname.split('/').pop()) ?? {};
  else if (method === 'GET' && pathname === '/citas') body = citas;
  else if (method === 'GET' && pathname === '/usuarios') body = usuarios;
  else if (method === 'GET' && pathname.startsWith('/usuarios/')) body = usuarios.find(u => u.id === pathname.split('/').pop()) ?? {};
  else if (method === 'POST' || method === 'PATCH') body = {};
  else if (method === 'DELETE') body = true;
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

const wait = async () => {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
};
const snap = async (name, fullPage = false) => {
  await page.screenshot({ path: path.join(out, name), fullPage });
};

await page.goto('http://127.0.0.1:4200/dashboard');
await wait();
await snap('02-dashboard.png');

await page.goto('http://127.0.0.1:4200/pacientes');
await wait();
await snap('03-pacientes.png');
await page.getByRole('button', { name: /Nuevo paciente/i }).click();
await page.waitForTimeout(250);
await snap('04-nuevo-paciente.png');
await page.getByRole('button', { name: 'Cerrar' }).click();

await page.goto('http://127.0.0.1:4200/agenda');
await wait();
await page.getByText('María López', { exact: true }).first().click();
await page.waitForTimeout(250);
await snap('05-agenda-detalle.png');

await page.goto('http://127.0.0.1:4200/historia-clinica?pacienteId=101');
await wait();
await snap('06-historia-clinica.png', true);

await page.goto('http://127.0.0.1:4200/reportes');
await wait();
await snap('07-reportes.png', true);

await page.goto('http://127.0.0.1:4200/configuracion');
await wait();
await snap('08-usuarios.png', true);

await page.goto('http://127.0.0.1:4200/perfil');
await wait();
await snap('09-perfil.png', true);

await browser.close();
console.log(out);
