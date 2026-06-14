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
const TEST_DB_PATH = path.join(__dirname, 'test_clientes.db');

let tokenAdmin;
let tokenEmpleado;
let clienteId;

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
});

afterAll(async () => {
  await closeSQLite();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

describe('GET /api/clientes', () => {
  it('admin puede listar clientes', async () => {
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('clientes');
    expect(Array.isArray(res.body.clientes)).toBe(true);
  });

  it('empleado puede listar clientes', async () => {
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${tokenEmpleado}`);

    expect(res.status).toBe(200);
  });

  it('rechaza sin token — 401', async () => {
    const res = await request(app).get('/api/clientes');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/clientes', () => {
  it('admin puede crear cliente', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Cliente Integración', telefono: '5551234567', ciudad: 'León' });

    expect(res.status).toBe(201);
    expect(res.body.cliente).toHaveProperty('id');
    expect(res.body.cliente.nombre).toBe('Cliente Integración');
    clienteId = res.body.cliente.id;
  });

  it('empleado no puede crear cliente — 403', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenEmpleado}`)
      .send({ nombre: 'Cliente No Permitido' });

    expect(res.status).toBe(403);
  });

  it('rechaza cliente sin nombre — 400', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ telefono: '5559999999' });

    expect(res.status).toBe(400);
  });

  it('rechaza sin token — 401', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .send({ nombre: 'Sin Auth' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/clientes/:id', () => {
  it('obtiene un cliente por id', async () => {
    const res = await request(app)
      .get(`/api/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.cliente).toHaveProperty('id', clienteId);
  });

  it('retorna 404 para cliente inexistente', async () => {
    const res = await request(app)
      .get('/api/clientes/99999')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/clientes/:id', () => {
  it('admin puede actualizar cliente', async () => {
    const res = await request(app)
      .put(`/api/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Cliente Actualizado', ciudad: 'Guadalajara' });

    expect(res.status).toBe(200);
  });

  it('empleado no puede actualizar cliente — 403', async () => {
    const res = await request(app)
      .put(`/api/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${tokenEmpleado}`)
      .send({ nombre: 'Intento Empleado' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/clientes/:id', () => {
  it('elimina cliente sin ventas', async () => {
    const nuevoCliente = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Cliente Para Borrar' });

    const id = nuevoCliente.body.cliente.id;

    const res = await request(app)
      .delete(`/api/clientes/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('empleado no puede eliminar cliente — 403', async () => {
    const res = await request(app)
      .delete(`/api/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${tokenEmpleado}`);

    expect(res.status).toBe(403);
  });
});