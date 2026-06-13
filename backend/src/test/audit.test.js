import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audit } from '../utils/audit.js';
import * as mongoConfig from '../config/mongo.js';
import * as auditLogModel from '../models/mongo/AuditLog.js';

vi.mock('../config/mongo.js');
vi.mock('../models/mongo/AuditLog.js');

describe('audit utility', () => {
  let mockReq;

  beforeEach(() => {
    vi.clearAllMocks();
    mongoConfig.isMongoConnected.mockReturnValue(true);

    mockReq = {
      user: { id: 1, nombre: 'Test User' },
      ip: '127.0.0.1',
      headers: {},
    };
  });

  it('registra una acción de auditoría correctamente', async () => {
    auditLogModel.default.create = vi.fn().mockResolvedValue({ _id: 'log-id' });

    await audit({
      accion: 'crear',
      entidad: 'producto',
      entidadId: 123,
      req: mockReq,
      payload: { nombre: 'Nuevo Producto' },
    });

    expect(auditLogModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'crear',
        entidad: 'producto',
        entidadId: '123',
        usuarioId: 1,
        usuarioNombre: 'Test User',
      })
    );
  });

  it('no registra si MongoDB no está conectado', async () => {
    mongoConfig.isMongoConnected.mockReturnValue(false);

    await audit({
      accion: 'crear',
      entidad: 'producto',
      entidadId: 123,
      req: mockReq,
      payload: { nombre: 'Nuevo Producto' },
    });

    expect(auditLogModel.default.create).not.toHaveBeenCalled();
  });

  it('obtiene la IP del header x-forwarded-for si está disponible', async () => {
    mockReq.headers['x-forwarded-for'] = '192.168.1.1';
    mockReq.ip = null;
    auditLogModel.default.create = vi.fn().mockResolvedValue({ _id: 'log-id' });

    await audit({
      accion: 'login',
      entidad: 'usuario',
      entidadId: 1,
      req: mockReq,
      payload: {},
    });

    expect(auditLogModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: '192.168.1.1',
      })
    );
  });

  it('maneja el caso de usuario sin ID', async () => {
    mockReq.user = undefined;
    auditLogModel.default.create = vi.fn().mockResolvedValue({ _id: 'log-id' });

    await audit({
      accion: 'acceso',
      entidad: 'dashboard',
      entidadId: null,
      req: mockReq,
      payload: {},
    });

    expect(auditLogModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: undefined,
        usuarioNombre: '',
        rol: '',
      })
    );
  });

  it('no rompe la operación si el registro falla', async () => {
    auditLogModel.default.create = vi.fn().mockRejectedValue(new Error('DB Error'));

    const result = await audit({
      accion: 'crear',
      entidad: 'producto',
      entidadId: 123,
      req: mockReq,
      payload: {},
    });

    expect(result).toBeUndefined();
  });

  it('convierte entidadId a string', async () => {
    auditLogModel.default.create = vi.fn().mockResolvedValue({ _id: 'log-id' });

    await audit({
      accion: 'actualizar',
      entidad: 'venta',
      entidadId: 999,
      req: mockReq,
      payload: { monto: 500 },
    });

    expect(auditLogModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entidadId: '999',
      })
    );
  });

  it('maneja entidadId null correctamente', async () => {
    auditLogModel.default.create = vi.fn().mockResolvedValue({ _id: 'log-id' });

    await audit({
      accion: 'listar',
      entidad: 'productos',
      entidadId: null,
      req: mockReq,
      payload: {},
    });

    expect(auditLogModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entidadId: undefined,
      })
    );
  });
});
