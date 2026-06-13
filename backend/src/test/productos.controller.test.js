import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listProductos, createProducto, updateProducto } from '../controllers/productos.controller.js';
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

describe('productos.controller - listProductos', () => {
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

  it('lista todos los productos activos', async () => {
    const mockProductos = [
      { id: 1, nombre: 'Producto 1', precio_base: 100 },
      { id: 2, nombre: 'Producto 2', precio_base: 200 },
    ];
    mockDb.all.mockResolvedValue(mockProductos);

    await listProductos(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ productos: mockProductos });
  });

  it('retorna lista vacía si no hay productos', async () => {
    mockDb.all.mockResolvedValue([]);

    await listProductos(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ productos: [] });
  });

  it('maneja errores de base de datos', async () => {
    mockDb.all.mockRejectedValue(new Error('DB Error'));

    await listProductos(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al obtener productos' });
  });
});

describe('productos.controller - createProducto', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
      run: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      body: { codigo: 'PROD001', nombre: 'Nuevo Producto', precio_base: 150 },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('crea un nuevo producto exitosamente', async () => {
    mockDb.get.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({ lastID: 1 });

    await createProducto(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ id: 1 });
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('rechaza creación sin código', async () => {
    mockReq.body = { nombre: 'Producto Sin Código' };

    await createProducto(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza creación sin nombre', async () => {
    mockReq.body = { codigo: 'PROD002' };

    await createProducto(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza si código ya existe', async () => {
    mockDb.get.mockResolvedValue({ id: 1 });

    await createProducto(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'El código ya existe' });
  });

  it('maneja errores de base de datos', async () => {
    mockDb.get.mockRejectedValue(new Error('DB Error'));

    await createProducto(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});

describe('productos.controller - updateProducto', () => {
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
      body: { nombre: 'Producto Actualizado', precio_base: 200 },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('actualiza un producto existente', async () => {
    mockDb.get.mockResolvedValue({ id: 1 });
    mockDb.run.mockResolvedValue();

    await updateProducto(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('retorna 404 si producto no existe', async () => {
    mockDb.get.mockResolvedValue(null);

    await updateProducto(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Producto no encontrado' });
  });

  it('maneja errores de base de datos', async () => {
    mockDb.get.mockRejectedValue(new Error('DB Error'));

    await updateProducto(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('actualiza solo los campos proporcionados', async () => {
    mockDb.get.mockResolvedValue({ id: 1 });
    mockDb.run.mockResolvedValue();

    mockReq.body = { nombre: 'Solo Nombre' };
    await updateProducto(mockReq, mockRes);

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE productos SET'),
      expect.arrayContaining([
        'Solo Nombre',
        undefined,
        undefined,
        '1',
      ])
    );
  });
});
