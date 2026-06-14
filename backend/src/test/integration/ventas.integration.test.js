import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../config/mongo.js', () => ({
  initMongo: vi.fn(),
  closeMongo: vi.fn(),
  isMongoConnected: vi.fn().mockReturnValue(false),
}));

vi.mock('../../utils/audit.js', () => ({
  audit: vi.fn(),
}));

vi.mock('../../utils/notificaciones.js', () => ({
  notificar: vi.fn(),
  notificarAdmins: vi.fn(),
}));

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initSQLite, closeSQLite } from '../../config/sqlite.js';
import app from '../../app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DB_PATH = path.join(__dirname, 'test_ventas.db');

let tokenAdmin;
let tokenEmpleado;
let clienteId;
let ventaId;

beforeAll(async () => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  process.env.SQLITE_PATH = TEST_DB_PATH;
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRATION = '1h';
  await initSQLite();

  const resAdmin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@hilos.app', password: 'admin123' });
  tokenAdmin = resAdmin.body.token;

  await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ nombre: 'Empleado Test', email: 'empleado@hilos.app', password: 'emp123', role: 'empleado' });

  const resEmp = await request(app)
    .post('/api/auth/login')
    .send({ email: 'empleado@hilos.app', password: 'emp123' });
  tokenEmpleado = resEmp.body.token;

  const resCliente = await request(app)
    .post('/api/clientes')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ nombre: 'Cliente Ventas Test', telefono: '5551234567' });
  clienteId = resCliente.body.cliente.id;
});

afterAll(async () => {
  await closeSQLite();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

describe('GET /api/ventas', () => {
  it('admin puede listar ventas', async () => {
    const res = await request(app)
      .get('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('notas');
    expect(Array.isArray(res.body.notas)).toBe(true);
  });

  it('empleado puede listar ventas', async () => {
    const res = await request(app)
      .get('/api/ventas')
      .set('Authorization', `Bearer ${tokenEmpleado}`);

    expect(res.status).toBe(200);
  });

  it('rechaza sin token — 401', async () => {
    const res = await request(app).get('/api/ventas');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/ventas', () => {
  it('admin puede crear venta con detalle válido', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        clienteId,
        fechaVenta: '2026-06-14',
        estadoPago: 'no_pagado',
        detalles: [{ tipo_hilo: 'Poliéster', cantidad: 10, precio_unitario: 50 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.nota).toHaveProperty('id');
    expect(res.body.nota.monto_final).toBe(500);
    ventaId = res.body.nota.id;
  });

  it('empleado puede crear venta', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenEmpleado}`)
      .send({
        clienteId,
        fechaVenta: '2026-06-14',
        estadoPago: 'no_pagado',
        detalles: [{ tipo_hilo: 'Algodón', cantidad: 5, precio_unitario: 30 }],
      });

    expect(res.status).toBe(201);
  });

  it('rechaza venta sin clienteId — 400', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        fechaVenta: '2026-06-14',
        estadoPago: 'no_pagado',
        detalles: [{ tipo_hilo: 'Poliéster', cantidad: 5, precio_unitario: 20 }],
      });

    expect(res.status).toBe(400);
  });

  it('rechaza venta sin detalles — 400', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        clienteId,
        fechaVenta: '2026-06-14',
        estadoPago: 'no_pagado',
        detalles: [],
      });

    expect(res.status).toBe(400);
  });

  it('rechaza estado de pago inválido — 400', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        clienteId,
        fechaVenta: '2026-06-14',
        estadoPago: 'cancelado',
        detalles: [{ tipo_hilo: 'Poliéster', cantidad: 5, precio_unitario: 20 }],
      });

    expect(res.status).toBe(400);
  });

  it('rechaza cliente inexistente — 404', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        clienteId: 99999,
        fechaVenta: '2026-06-14',
        estadoPago: 'no_pagado',
        detalles: [{ tipo_hilo: 'Poliéster', cantidad: 5, precio_unitario: 20 }],
      });

    expect(res.status).toBe(404);
  });

  it('rechaza sin token — 401', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .send({ clienteId, fechaVenta: '2026-06-14', estadoPago: 'no_pagado', detalles: [] });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/ventas/:id', () => {
  it('obtiene detalle de una venta', async () => {
    const res = await request(app)
      .get(`/api/ventas/${ventaId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.nota).toHaveProperty('id', ventaId);
  });

  it('retorna 404 para venta inexistente', async () => {
    const res = await request(app)
      .get('/api/ventas/99999')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/ventas/:id', () => {
  it('admin puede eliminar venta', async () => {
    const resNueva = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        clienteId,
        fechaVenta: '2026-06-14',
        estadoPago: 'no_pagado',
        detalles: [{ tipo_hilo: 'Poliéster', cantidad: 1, precio_unitario: 10 }],
      });
    const idBorrar = resNueva.body.nota.id;

    const res = await request(app)
      .delete(`/api/ventas/${idBorrar}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('empleado no puede eliminar venta — 403', async () => {
    const res = await request(app)
      .delete(`/api/ventas/${ventaId}`)
      .set('Authorization', `Bearer ${tokenEmpleado}`);

    expect(res.status).toBe(403);
  });
});