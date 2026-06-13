import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listClientes } from '../controllers/clientes.controller.js';
import * as sqliteModule from '../config/sqlite.js';

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
        ultima_compra: '2024-01-15',
      },
      {
        id: 2,
        nombre: 'Cliente 2',
        email: 'cliente2@test.com',
        total_ventas: 3,
        total_comprado: 600,
        saldo_pendiente: 0,
        ultima_compra: '2024-01-10',
      },
    ];
    mockDb.all.mockResolvedValue(mockClientes);

    await listClientes(mockReq, mockRes);

    expect(mockDb.run).toHaveBeenCalled();
    expect(mockDb.all).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({ clientes: mockClientes });
  });

  it('retorna lista vacía si no hay clientes', async () => {
    mockDb.run.mockResolvedValue();
    mockDb.all.mockResolvedValue([]);

    await listClientes(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ clientes: [] });
  });

  it('maneja errores de base de datos', async () => {
    mockDb.run.mockRejectedValue(new Error('DB Error'));

    await listClientes(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al obtener clientes' });
  });

  it('actualiza estado de inactividad antes de listar', async () => {
    mockDb.run.mockResolvedValue();
    mockDb.all.mockResolvedValue([]);

    await listClientes(mockReq, mockRes);

    // Verifica que se llamó a actualizarInactividad
    expect(mockDb.run).toHaveBeenCalledTimes(2);
  });
});
