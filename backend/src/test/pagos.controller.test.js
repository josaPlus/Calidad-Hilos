import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listPagos, saldosPendientes, registrarPago } from '../controllers/pagos.controller.js';
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

describe('pagos.controller - listPagos', () => {
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

  it('lista todos los pagos ordenados por fecha', async () => {
    const mockPagos = [
      { id: 1, nota_id: 1, monto_pagado: 500, metodo_pago: 'efectivo', fecha_pago: '2024-01-15' },
      { id: 2, nota_id: 2, monto_pagado: 300, metodo_pago: 'transferencia', fecha_pago: '2024-01-14' },
    ];
    mockDb.all.mockResolvedValue(mockPagos);

    await listPagos(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ pagos: mockPagos });
  });

  it('retorna lista vacía si no hay pagos', async () => {
    mockDb.all.mockResolvedValue([]);

    await listPagos(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ pagos: [] });
  });

  it('maneja errores de base de datos', async () => {
    mockDb.all.mockRejectedValue(new Error('DB Error'));

    await listPagos(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al listar pagos' });
  });
});

describe('pagos.controller - saldosPendientes', () => {
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

  it('lista clientes con saldos pendientes', async () => {
    const mockSaldos = [
      {
        cliente_id: 1,
        nombre_cliente: 'Cliente 1',
        monto_total: 1000,
        monto_pendiente: 300,
        ultima_compra: '2024-01-15',
      },
    ];
    mockDb.all.mockResolvedValue(mockSaldos);

    await saldosPendientes(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ saldos: mockSaldos });
  });

  it('retorna lista vacía si no hay saldos pendientes', async () => {
    mockDb.all.mockResolvedValue([]);

    await saldosPendientes(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ saldos: [] });
  });

  it('maneja errores de base de datos', async () => {
    mockDb.all.mockRejectedValue(new Error('DB Error'));

    await saldosPendientes(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});

describe('pagos.controller - registrarPago', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
      run: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      body: {
        notaId: 1,
        montoPagado: 500,
        metodoPago: 'efectivo',
        fechaPago: '2024-01-15',
      },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('registra un pago exitosamente', async () => {
    mockDb.get
      .mockResolvedValueOnce({ id: 1, monto_final: 500, numero_nota: 'NR-001' })
      .mockResolvedValueOnce({ s: 0 });
    mockDb.run.mockResolvedValue({ lastID: 1 });

    await registrarPago(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ id: 1, nuevoEstado: 'pagado' });
    expect(auditModule.audit).toHaveBeenCalled();
    expect(notificacionesModule.notificar).toHaveBeenCalled();
  });

  it('rechaza pago sin notaId', async () => {
    mockReq.body.notaId = undefined;

    await registrarPago(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza pago sin montoPagado válido', async () => {
    mockReq.body.montoPagado = -100;

    await registrarPago(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza pago con metodoPago inválido', async () => {
    mockReq.body.metodoPago = 'bitcoin';

    await registrarPago(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza pago sin fechaPago', async () => {
    mockReq.body.fechaPago = undefined;

    await registrarPago(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza si nota no existe', async () => {
    mockDb.get.mockResolvedValue(null);

    await registrarPago(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Nota no encontrada' });
  });

  it('rechaza si monto excede pendiente', async () => {
    mockDb.get
      .mockResolvedValueOnce({ id: 1, monto_final: 500, numero_nota: 'NR-001' })
      .mockResolvedValueOnce({ s: 0 });

    mockReq.body.montoPagado = 600;

    await registrarPago(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('mayor al pendiente') })
    );
  });

  it('calcula correctamente el nuevo estado cuando se paga completamente', async () => {
    mockDb.get
      .mockResolvedValueOnce({ id: 1, monto_final: 500, numero_nota: 'NR-001' })
      .mockResolvedValueOnce({ s: 0 });
    mockDb.run.mockResolvedValue({ lastID: 1 });

    await registrarPago(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ nuevoEstado: 'pagado' })
    );
  });

  it('calcula correctamente el nuevo estado cuando es pago parcial', async () => {
    mockDb.get
      .mockResolvedValueOnce({ id: 1, monto_final: 1000, numero_nota: 'NR-001' })
      .mockResolvedValueOnce({ s: 0 });
    mockDb.run.mockResolvedValue({ lastID: 1 });

    mockReq.body.montoPagado = 300;

    await registrarPago(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ nuevoEstado: 'pendiente_de_completar' })
    );
  });

  it('maneja errores de base de datos', async () => {
    mockDb.get.mockRejectedValue(new Error('DB Error'));

    await registrarPago(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
