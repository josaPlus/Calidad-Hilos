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
const TEST_DB_PATH = path.join(__dirname, 'test_pagos.db');

let tokenAdmin;
let tokenEmpleado;
let ventaId;
let ventaIdCompleta;

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
        .send({ nombre: 'Cliente Pagos Test' });
    const clienteId = resCliente.body.cliente.id;

    const resVenta = await request(app)
        .post('/api/ventas')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
            clienteId,
            fechaVenta: '2026-06-14',
            estadoPago: 'no_pagado',
            detalles: [{ tipo_hilo: 'Poliéster', cantidad: 10, precio_unitario: 100 }],
        });
    ventaId = resVenta.body.nota.id;

    const resVenta2 = await request(app)
        .post('/api/ventas')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
            clienteId,
            fechaVenta: '2026-06-14',
            estadoPago: 'no_pagado',
            detalles: [{ tipo_hilo: 'Algodón', cantidad: 5, precio_unitario: 50 }],
        });
    ventaIdCompleta = resVenta2.body.nota.id;
});

afterAll(async () => {
    await closeSQLite();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

describe('GET /api/pagos', () => {
    it('admin puede listar pagos', async () => {
        const res = await request(app)
            .get('/api/pagos')
            .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('pagos');
        expect(Array.isArray(res.body.pagos)).toBe(true);
    });

    it('empleado puede listar pagos', async () => {
        const res = await request(app)
            .get('/api/pagos')
            .set('Authorization', `Bearer ${tokenEmpleado}`);

        expect(res.status).toBe(200);
    });

    it('rechaza sin token — 401', async () => {
        const res = await request(app).get('/api/pagos');

        expect(res.status).toBe(401);
    });
});

describe('GET /api/pagos/saldo/pendiente', () => {
    it('retorna saldos pendientes', async () => {
        const res = await request(app)
            .get('/api/pagos/saldo/pendiente')
            .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('saldos');
        expect(Array.isArray(res.body.saldos)).toBe(true);
    });

    it('rechaza sin token — 401', async () => {
        const res = await request(app).get('/api/pagos/saldo/pendiente');

        expect(res.status).toBe(401);
    });
});

describe('POST /api/pagos', () => {
    it('registra pago parcial correctamente', async () => {
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        notaId: ventaId,
        montoPagado: 500,
        metodoPago: 'efectivo',
        fechaPago: '2026-06-14',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('nuevoEstado', 'pendiente_de_completar');
    expect(res.body).toHaveProperty('id');
  });

    it('registra pago completo y cambia estado a pagado', async () => {
        const res = await request(app)
            .post('/api/pagos')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({
                notaId: ventaIdCompleta,
                montoPagado: 250,
                metodoPago: 'transferencia',
                fechaPago: '2026-06-14',
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('nuevoEstado', 'pagado');
    });

    it('empleado puede registrar pago', async () => {
        const resCliente = await request(app)
            .post('/api/clientes')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ nombre: 'Cliente Extra' });

        const resVenta = await request(app)
            .post('/api/ventas')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({
                clienteId: resCliente.body.cliente.id,
                fechaVenta: '2026-06-14',
                estadoPago: 'no_pagado',
                detalles: [{ tipo_hilo: 'Lana', cantidad: 2, precio_unitario: 80 }],
            });

        const res = await request(app)
            .post('/api/pagos')
            .set('Authorization', `Bearer ${tokenEmpleado}`)
            .send({
                notaId: resVenta.body.nota.id,
                montoPagado: 160,
                metodoPago: 'efectivo',
                fechaPago: '2026-06-14',
            });

        expect(res.status).toBe(201);
    });

    it('rechaza monto mayor al pendiente — 400', async () => {
        const res = await request(app)
            .post('/api/pagos')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({
                notaId: ventaId,
                montoPagado: 99999,
                metodoPago: 'efectivo',
                fechaPago: '2026-06-14',
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/pendiente/i);
    });

    it('rechaza nota inexistente — 404', async () => {
        const res = await request(app)
            .post('/api/pagos')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({
                notaId: 99999,
                montoPagado: 100,
                metodoPago: 'efectivo',
                fechaPago: '2026-06-14',
            });

        expect(res.status).toBe(404);
    });

    it('rechaza sin token — 401', async () => {
        const res = await request(app)
            .post('/api/pagos')
            .send({ notaId: ventaId, montoPagado: 100, metodoPago: 'efectivo', fechaPago: '2026-06-14' });

        expect(res.status).toBe(401);
    });
});