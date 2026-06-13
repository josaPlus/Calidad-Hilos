import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificar, notificarAdmins } from '../utils/notificaciones.js';
import * as mongoConfig from '../config/mongo.js';
import * as notificacionModel from '../models/mongo/Notificacion.js';
import * as sqliteModule from '../config/sqlite.js';

vi.mock('../config/mongo.js');
vi.mock('../models/mongo/Notificacion.js');
vi.mock('../config/sqlite.js');

describe('notificar utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mongoConfig.isMongoConnected.mockReturnValue(true);
  });

  it('crea una notificación correctamente', async () => {
    notificacionModel.default.create = vi.fn().mockResolvedValue({ _id: 'notif-id' });

    await notificar({
      usuarioId: 1,
      tipo: 'info',
      titulo: 'Nuevo Producto',
      mensaje: 'Se agregó un nuevo producto',
      link: '/productos/1',
    });

    expect(notificacionModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 1,
        tipo: 'info',
        titulo: 'Nuevo Producto',
        mensaje: 'Se agregó un nuevo producto',
        link: '/productos/1',
      })
    );
  });

  it('establece tipo por defecto a "info"', async () => {
    notificacionModel.default.create = vi.fn().mockResolvedValue({ _id: 'notif-id' });

    await notificar({
      usuarioId: 1,
      titulo: 'Test',
      mensaje: 'Test mensaje',
    });

    expect(notificacionModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'info',
      })
    );
  });

  it('establece link vacío por defecto', async () => {
    notificacionModel.default.create = vi.fn().mockResolvedValue({ _id: 'notif-id' });

    await notificar({
      usuarioId: 1,
      titulo: 'Test',
      mensaje: 'Test mensaje',
    });

    expect(notificacionModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        link: '',
      })
    );
  });

  it('establece metadata vacía por defecto', async () => {
    notificacionModel.default.create = vi.fn().mockResolvedValue({ _id: 'notif-id' });

    await notificar({
      usuarioId: 1,
      titulo: 'Test',
      mensaje: 'Test mensaje',
    });

    expect(notificacionModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {},
      })
    );
  });

  it('no rompe operación si MongoDB falla', async () => {
    notificacionModel.default.create = vi.fn().mockRejectedValue(new Error('DB Error'));

    const result = await notificar({
      usuarioId: 1,
      titulo: 'Test',
      mensaje: 'Test mensaje',
    });

    expect(result).toBeUndefined();
  });

  it('no notifica si MongoDB no está conectado', async () => {
    mongoConfig.isMongoConnected.mockReturnValue(false);

    await notificar({
      usuarioId: 1,
      titulo: 'Test',
      mensaje: 'Test mensaje',
    });

    expect(notificacionModel.default.create).not.toHaveBeenCalled();
  });
});

describe('notificarAdmins utility', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mongoConfig.isMongoConnected.mockReturnValue(true);
    mockDb = {
      all: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);
  });

  it('notifica a todos los admins activos', async () => {
    const mockAdmins = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ];
    mockDb.all.mockResolvedValue(mockAdmins);
    notificacionModel.default.create = vi.fn().mockResolvedValue({ _id: 'notif-id' });

    await notificarAdmins({
      tipo: 'alerta',
      titulo: 'Alerta de Ventas',
      mensaje: 'Nueva venta importante',
      link: '/ventas/100',
      metadata: { venta_id: 100 },
    });

    expect(notificacionModel.default.create).toHaveBeenCalledTimes(3);
    expect(mockDb.all).toHaveBeenCalledWith(
      "SELECT id FROM usuarios WHERE role = 'admin' AND activo = 1"
    );
  });

  it('notifica solo a admins activos', async () => {
    mockDb.all.mockResolvedValue([{ id: 1 }]);
    notificacionModel.default.create = vi.fn().mockResolvedValue({ _id: 'notif-id' });

    await notificarAdmins({
      tipo: 'info',
      titulo: 'Info',
      mensaje: 'Mensaje',
    });

    expect(notificacionModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 1,
      })
    );
  });

  it('establece link vacío por defecto', async () => {
    mockDb.all.mockResolvedValue([{ id: 1 }]);
    notificacionModel.default.create = vi.fn().mockResolvedValue({ _id: 'notif-id' });

    await notificarAdmins({
      tipo: 'info',
      titulo: 'Test',
      mensaje: 'Test',
    });

    expect(notificacionModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        link: '',
      })
    );
  });

  it('establece metadata vacía por defecto', async () => {
    mockDb.all.mockResolvedValue([{ id: 1 }]);
    notificacionModel.default.create = vi.fn().mockResolvedValue({ _id: 'notif-id' });

    await notificarAdmins({
      tipo: 'info',
      titulo: 'Test',
      mensaje: 'Test',
    });

    expect(notificacionModel.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {},
      })
    );
  });

  it('no rompe operación si hay error en base de datos', async () => {
    mockDb.all.mockRejectedValue(new Error('DB Error'));

    const result = await notificarAdmins({
      tipo: 'info',
      titulo: 'Test',
      mensaje: 'Test',
    });

    expect(result).toBeUndefined();
  });

  it('no notifica si MongoDB no está conectado', async () => {
    mongoConfig.isMongoConnected.mockReturnValue(false);

    await notificarAdmins({
      tipo: 'info',
      titulo: 'Test',
      mensaje: 'Test',
    });

    expect(mockDb.all).not.toHaveBeenCalled();
    expect(notificacionModel.default.create).not.toHaveBeenCalled();
  });

  it('maneja múltiples admins con éxito', async () => {
    mockDb.all.mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
    ]);
    notificacionModel.default.create = vi.fn().mockResolvedValue({ _id: 'notif-id' });

    await notificarAdmins({
      tipo: 'critical',
      titulo: 'Error Crítico',
      mensaje: 'Sistema en error',
    });

    expect(notificacionModel.default.create).toHaveBeenCalledTimes(4);
  });
});
