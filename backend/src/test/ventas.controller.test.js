import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proximoNumero, listVentas, getVenta, createVenta } from '../controllers/ventas.controller.js';
import * as sqliteModule from '../config/sqlite.js';
import * as auditModule from '../utils/audit.js';
import * as notificacionesModule from '../utils/notificaciones.js';

vi.mock('../config/sqlite.js');
vi.mock('../utils/audit.js');
vi.mock('../utils/notificaciones.js');
vi.mock('../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ventas.controller - proximoNumero', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      json: vi.fn(),
    };
  });

  it('obtiene el próximo número de nota', async () => {
    mockDb.get.mockResolvedValue({ m: 5 });

    await proximoNumero(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ proximoNumero: 6 });
  });

  it('retorna 1 como primera nota', async () => {
    mockDb.get.mockResolvedValue({ m: 0 });

    await proximoNumero(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ proximoNumero: 1 });
  });
});

describe('ventas.controller - listVentas', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      all: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

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

  it('lista todas las ventas', async () => {
    const mockVentas = [
      {
        id: 1,
        numero_nota: 1,
        monto_final: 500,
        estado_pago: 'pagado',
        detalles: [{ tipo_hilo: 'Poliéster' }],
      },
    ];
    mockDb.all
      .mockResolvedValueOnce(mockVentas)
      .mockResolvedValueOnce([{ nota_id: 1, tipo_hilo: 'Poliéster' }]);

    await listVentas(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ notas: expect.any(Array) });
  });

  it('filtra ventas por cliente', async () => {
    mockReq.query.clienteId = '1';
    mockDb.all.mockResolvedValue([]);

    await listVentas(mockReq, mockRes);

    expect(mockDb.all).toHaveBeenCalledWith(
      expect.stringContaining('cliente_id'),
      expect.arrayContaining(['1'])
    );
  });

  it('filtra ventas por estado de pago', async () => {
    mockReq.query.estadoPago = 'no_pagado';
    mockDb.all.mockResolvedValue([]);

    await listVentas(mockReq, mockRes);

    expect(mockDb.all).toHaveBeenCalledWith(
      expect.stringContaining('estado_pago'),
      expect.any(Array)
    );
  });

  it('maneja errores de base de datos', async () => {
    mockDb.all.mockRejectedValue(new Error('DB Error'));

    await listVentas(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al listar ventas' });
  });
});

describe('ventas.controller - getVenta', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
      all: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

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

  it('obtiene detalle de una venta', async () => {
    const mockVenta = {
      id: 1,
      numero_nota: 1,
      monto_final: 500,
      cliente_id: 1,
    };
    mockDb.get
      .mockResolvedValueOnce(mockVenta)
      .mockResolvedValueOnce({ id: 1, nombre: 'Cliente' });
    mockDb.all.mockResolvedValue([{ tipo_hilo: 'Poliéster', cantidad: 10 }]);

    await getVenta(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({
      nota: expect.objectContaining({ id: 1 }),
    });
  });

  it('retorna 404 si venta no existe', async () => {
    mockDb.get.mockResolvedValue(null);

    await getVenta(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Venta no encontrada' });
  });
});

describe('ventas.controller - createVenta', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
      run: vi.fn(),
      exec: vi.fn().mockImplementation(() => Promise.resolve()),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      body: {
        clienteId: 1,
        fechaVenta: '2024-01-15',
        estadoPago: 'no_pagado',
        descuentoPorcentaje: 5,
        detalles: [
          {
            tipo_hilo: 'Poliéster',
            cantidad: 10,
            precio_unitario: 50,
          },
        ],
      },
      user: { id: 1, nombre: 'Usuario Test' },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('crea una venta correctamente', async () => {
    mockDb.get
      .mockResolvedValueOnce({ descuento_global: 0 })
      .mockResolvedValueOnce({ m: 0 });
    mockDb.run.mockResolvedValue({ lastID: 1 });

    await createVenta(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        nota: expect.objectContaining({ numero_nota: 1 }),
      })
    );
    expect(auditModule.audit).toHaveBeenCalled();
    expect(notificacionesModule.notificar).toHaveBeenCalled();
  });

  it('rechaza venta sin cliente', async () => {
    mockReq.body.clienteId = undefined;

    await createVenta(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('obligatorios') })
    );
  });

  it('rechaza venta sin detalles', async () => {
    mockReq.body.detalles = [];

    await createVenta(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza estado de pago inválido', async () => {
    mockReq.body.estadoPago = 'cancelado';

    await createVenta(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('estadoPago') })
    );
  });

  it('rechaza método de pago inválido cuando estado es pagado', async () => {
    mockReq.body.estadoPago = 'pagado';
    mockReq.body.metodoPago = 'bitcoin';

    await createVenta(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza cantidad inválida en detalle', async () => {
    mockReq.body.detalles[0].cantidad = 0;

    await createVenta(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza cliente no encontrado', async () => {
    mockDb.get.mockResolvedValueOnce(null);

    await createVenta(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Cliente no encontrado' });
  });

  it('notifica admins para venta de monto alto', async () => {
    mockReq.body.detalles = [
      {
        tipo_hilo: 'Poliéster',
        cantidad: 200,
        precio_unitario: 50,
      },
    ];
    mockDb.get
      .mockResolvedValueOnce({ descuento_global: 0 })
      .mockResolvedValueOnce({ m: 0 });
    mockDb.run.mockResolvedValue({ lastID: 1 });

    await createVenta(mockReq, mockRes);

    expect(notificacionesModule.notificarAdmins).toHaveBeenCalled();
  });

  it('calcula correctamente el monto final con descuento', async () => {
    mockDb.get
      .mockResolvedValueOnce({ descuento_global: 0 })
      .mockResolvedValueOnce({ m: 0 });
    mockDb.run.mockResolvedValue({ lastID: 1 });

    await createVenta(mockReq, mockRes);

    const subtotal = 10 * 50; // 500
    const descuento = subtotal * (5 / 100); // 25
    const montoFinal = subtotal - descuento; // 475

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        nota: expect.objectContaining({
          monto_final: montoFinal,
        }),
      })
    );
  });
});
