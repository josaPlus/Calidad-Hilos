import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listClientes, getCliente, createCliente, updateCliente, deleteCliente, addDescuento, deleteDescuento } from '../controllers/clientes.controller.js';
import * as sqliteModule from '../config/sqlite.js';
import * as auditModule from '../utils/audit.js';

vi.mock('../config/sqlite.js');
vi.mock('../utils/audit.js');
vi.mock('../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('clientes.controller - listClientes', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn(),
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

  it('lista todos los clientes con estadísticas', async () => {
    mockDb.run.mockResolvedValue();
    const mockClientes = [
      {
        id: 1,
        nombre: 'Cliente 1',
        email: 'cliente1@test.com',
        total_ventas: 5,
        total_comprado: 1000,
        saldo_pendiente: 200,
      },
    ];
    mockDb.all.mockResolvedValue(mockClientes);

    await listClientes(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ clientes: mockClientes });
  });

  it('maneja errores de base de datos', async () => {
    mockDb.run.mockRejectedValue(new Error('DB Error'));

    await listClientes(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});

describe('clientes.controller - getCliente', () => {
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

  it('obtiene un cliente con sus descuentos', async () => {
    const mockCliente = { id: 1, nombre: 'Cliente 1', email: 'test@test.com' };
    const mockDescuentos = [
      { id: 1, cliente_id: 1, porcentaje_descuento: 10 },
    ];
    mockDb.get.mockResolvedValue(mockCliente);
    mockDb.all.mockResolvedValue(mockDescuentos);

    await getCliente(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ cliente: mockCliente, descuentos: mockDescuentos });
  });

  it('retorna 404 si cliente no existe', async () => {
    mockDb.get.mockResolvedValue(null);

    await getCliente(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Cliente no encontrado' });
  });
});

describe('clientes.controller - createCliente', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn(),
      get: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      body: {
        nombre: 'Nuevo Cliente',
        telefono: '5551234567',
        domicilio: 'Calle 123',
        ciudad: 'CDMX',
        email: 'cliente@test.com',
        descuento_global: 5,
      },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('crea un nuevo cliente correctamente', async () => {
    mockDb.run.mockResolvedValue({ lastID: 1 });
    mockDb.get.mockResolvedValue({ id: 1, nombre: 'Nuevo Cliente' });

    await createCliente(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ cliente: expect.any(Object) })
    );
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('maneja errores de base de datos', async () => {
    mockDb.run.mockRejectedValue(new Error('DB Error'));

    await createCliente(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});

describe('clientes.controller - updateCliente', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
      run: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      params: { id: '1' },
      body: {
        nombre: 'Cliente Actualizado',
        estado_cliente: 'inactivo',
      },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('actualiza un cliente existente', async () => {
    mockDb.get.mockResolvedValue({ id: 1 });
    mockDb.run.mockResolvedValue();
    mockDb.get.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 1, nombre: 'Cliente Actualizado' });

    await updateCliente(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ cliente: expect.any(Object) })
    );
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('retorna 404 si cliente no existe', async () => {
    mockDb.get.mockResolvedValue(null);

    await updateCliente(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });
});

describe('clientes.controller - deleteCliente', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
      run: vi.fn(),
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

  it('elimina un cliente sin ventas', async () => {
    mockDb.get.mockResolvedValue({ n: 0 });
    mockDb.run.mockResolvedValue();

    await deleteCliente(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('rechaza eliminar cliente con ventas', async () => {
    mockDb.get.mockResolvedValue({ n: 5 });

    await deleteCliente(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('ventas') })
    );
  });
});

describe('clientes.controller - addDescuento', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      params: { id: '1' },
      body: {
        tipo_hilo: 'Poliéster',
        cantidad_minima: 100,
        porcentaje_descuento: 15,
      },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('agrega un descuento a cliente', async () => {
    mockDb.run.mockResolvedValue({ lastID: 1 });

    await addDescuento(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ id: 1 });
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('maneja errores al crear descuento', async () => {
    mockDb.run.mockRejectedValue(new Error('DB Error'));

    await addDescuento(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});

describe('clientes.controller - deleteDescuento', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      params: { descuentoId: '1' },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('elimina un descuento correctamente', async () => {
    mockDb.run.mockResolvedValue();

    await deleteDescuento(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('maneja errores al eliminar descuento', async () => {
    mockDb.run.mockRejectedValue(new Error('DB Error'));

    await deleteDescuento(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
