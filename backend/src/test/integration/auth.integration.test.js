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
const TEST_DB_PATH = path.join(__dirname, 'test_auth.db');

beforeAll(async () => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  process.env.SQLITE_PATH = TEST_DB_PATH;
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRATION = '1h';
  await initSQLite();
});

afterAll(async () => {
  await closeSQLite();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

describe('POST /api/auth/login', () => {
  it('login exitoso con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hilos.app', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('admin@hilos.app');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('rechaza credenciales incorrectas — 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hilos.app', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });


});

describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hilos.app', password: 'admin123' });
    token = res.body.token;
  });

  it('retorna datos del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('email', 'admin@hilos.app');
    expect(res.body.user).not.toHaveProperty('password');
  });


});

describe('POST /api/auth/logout', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hilos.app', password: 'admin123' });
    token = res.body.token;
  });

  it('cierra sesión correctamente', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });


});