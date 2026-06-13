import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listEgresos, createEgreso, deleteEgreso, listCategorias } from '../controllers/egresos.controller.js';
import * as mongoModule from '../config/mongo.js';
import * as sqliteModule from '../config/sqlite.js';
import * as auditModule from '../utils/audit.js';
import * as notificacionesModule from '../utils/notificaciones.js';

vi.mock('../config/mongo.js');
vi.mock('../config/sqlite.js');
vi.mock('../utils/audit.js');
vi.mock('../utils/notificaciones.js');
vi.mock('../models/mongo/Egreso.js', () => ({
  default: {
    find: vi.fn(),
    create: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

import egresoModel from '../models/mongo/Egreso.js';
const mockEgresoModel = egresoModel;
vi.mock('../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('egresos.controller - listEgresos', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mongoModule.isMongoConnected.mockReturnValue(true);
    mockDb = {};

    mockReq = {
      query: {},
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('lista todos los egresos', async () => {
    const mockEgresos = [
      { _id: 1, concepto: 'Compra', monto: 500, categoria: 'Materiales' },
      { _id: 2, concepto: 'Servicios', monto: 300, categoria: 'Servicios' },
    ];
    mockEgresoModel.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockEgresos),
      }),
    });

    await listEgresos(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ egresos: mockEgresos });
  });

  it('filtra egresos por categoría', async () => {
    mockReq.query.categoria = 'Materiales';
    mockEgresoModel.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });

    await listEgresos(mockReq, mockRes);

    expect(mockEgresoModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ categoria: 'Materiales' })
    );
  });

  it('filtra egresos por rango de fechas', async () => {
    mockReq.query.desde = '2024-01-01';
    mockReq.query.hasta = '2024-01-31';
    mockEgresoModel.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });

    await listEgresos(mockReq, mockRes);

    expect(mockEgresoModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        }),
      })
    );
  });

  it('retorna error si MongoDB no está conectado', async () => {
    mongoModule.isMongoConnected.mockReturnValue(false);

    await listEgresos(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('MongoDB') })
    );
  });

  it('maneja errores de base de datos', async () => {
    mockEgresoModel.find.mockImplementation(() => {
      throw new Error('DB Error');
    });

    await listEgresos(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});

describe('egresos.controller - createEgreso', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mongoModule.isMongoConnected.mockReturnValue(true);
    mockDb = {
      get: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      body: {
        fecha: '2024-01-15',
        categoria: 'Materiales',
        concepto: 'Compra de hilos',
        monto: 500,
        metodoPago: 'transferencia',
        referencia: 'REF-001',
        observaciones: 'Compra urgente',
        tags: ['urgente'],
      },
      user: { id: 1, nombre: 'Usuario Test' },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('crea un egreso correctamente', async () => {
    mockDb.get.mockResolvedValue({ id: 1 });
    const mockEgreso = { _id: '1', ...mockReq.body };
    mockEgresoModel.create.mockResolvedValue(mockEgreso);

    await createEgreso(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ egreso: mockEgreso });
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('rechaza egreso sin fecha', async () => {
    mockReq.body.fecha = undefined;

    await createEgreso(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('obligatorios') })
    );
  });

  it('rechaza egreso sin categoría', async () => {
    mockReq.body.categoria = undefined;

    await createEgreso(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza egreso sin concepto', async () => {
    mockReq.body.concepto = undefined;

    await createEgreso(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza egreso sin monto', async () => {
    mockReq.body.monto = undefined;

    await createEgreso(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza monto negativo', async () => {
    mockReq.body.monto = -100;

    await createEgreso(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('inválido') })
    );
  });

  it('rechaza categoría no válida', async () => {
    mockDb.get.mockResolvedValue(null);

    await createEgreso(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Categoría') })
    );
  });

  it('notifica admins para egreso de monto alto', async () => {
    mockDb.get.mockResolvedValue({ id: 1 });
    mockReq.body.monto = 5000;
    const mockEgreso = { _id: '1', ...mockReq.body };
    mockEgresoModel.create.mockResolvedValue(mockEgreso);

    await createEgreso(mockReq, mockRes);

    expect(notificacionesModule.notificarAdmins).toHaveBeenCalled();
  });

  it('establece método de pago por defecto', async () => {
    mockDb.get.mockResolvedValue({ id: 1 });
    mockReq.body.metodoPago = undefined;
    const mockEgreso = { _id: '1', ...mockReq.body, metodoPago: 'efectivo' };
    mockEgresoModel.create.mockResolvedValue(mockEgreso);

    await createEgreso(mockReq, mockRes);

    expect(mockEgresoModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ metodoPago: 'efectivo' })
    );
  });

  it('retorna error si MongoDB no está conectado', async () => {
    mongoModule.isMongoConnected.mockReturnValue(false);

    await createEgreso(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(503);
  });
});

describe('egresos.controller - deleteEgreso', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    mongoModule.isMongoConnected.mockReturnValue(true);

    mockReq = {
      params: { id: '1' },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('elimina un egreso correctamente', async () => {
    mockEgresoModel.findByIdAndDelete.mockResolvedValue({ _id: '1' });

    await deleteEgreso(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('maneja errores al eliminar', async () => {
    mockEgresoModel.findByIdAndDelete.mockRejectedValue(new Error('DB Error'));

    await deleteEgreso(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('retorna error si MongoDB no está conectado', async () => {
    mongoModule.isMongoConnected.mockReturnValue(false);

    await deleteEgreso(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(503);
  });
});

describe('egresos.controller - listCategorias', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      all: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('lista todas las categorías de egreso', async () => {
    const mockCategorias = [
      { id: 1, nombre: 'Materiales', activo: 1 },
      { id: 2, nombre: 'Servicios', activo: 1 },
      { id: 3, nombre: 'Utilities', activo: 1 },
    ];
    mockDb.all.mockResolvedValue(mockCategorias);

    await listCategorias(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ categorias: mockCategorias });
  });

  it('retorna lista vacía si no hay categorías', async () => {
    mockDb.all.mockResolvedValue([]);

    await listCategorias(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ categorias: [] });
  });

  it('solo lista categorías activas', async () => {
    mockDb.all.mockResolvedValue([]);

    await listCategorias(mockReq, mockRes);

    expect(mockDb.all).toHaveBeenCalledWith(
      expect.stringContaining('activo = 1')
    );
  });

  it('maneja errores de base de datos', async () => {
    mockDb.all.mockRejectedValue(new Error('DB Error'));

    await listCategorias(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: expect.stringContaining('Categorias') });
  });
});
