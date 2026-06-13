import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/users.controller.js';
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
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

describe('users.controller - listUsers', () => {
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

  it('lista todos los usuarios', async () => {
    const mockUsers = [
      { id: 1, nombre: 'Admin', email: 'admin@test.com', role: 'admin', activo: 1 },
      { id: 2, nombre: 'Empleado', email: 'emp@test.com', role: 'empleado', activo: 1 },
    ];
    mockDb.all.mockResolvedValue(mockUsers);

    await listUsers(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ users: mockUsers });
  });

  it('retorna lista vacía si no hay usuarios', async () => {
    mockDb.all.mockResolvedValue([]);

    await listUsers(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ users: [] });
  });

  it('maneja errores de base de datos', async () => {
    mockDb.all.mockRejectedValue(new Error('DB Error'));

    await listUsers(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al listar usuarios' });
  });
});

describe('users.controller - createUser', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
      run: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      body: { nombre: 'New User', email: 'new@test.com', password: 'password123', role: 'empleado' },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('crea un nuevo usuario exitosamente', async () => {
    mockDb.get.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({ lastID: 2 });

    const bcrypt = (await import('bcryptjs')).default;
    bcrypt.hash.mockResolvedValue('hashed-password');

    await createUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ email: 'new@test.com' }),
      })
    );
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('establece rol por defecto como empleado', async () => {
    mockDb.get.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({ lastID: 2 });

    const bcrypt = (await import('bcryptjs')).default;
    bcrypt.hash.mockResolvedValue('hashed-password');

    mockReq.body.role = undefined;
    await createUser(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ role: 'empleado' }),
      })
    );
  });

  it('rechaza si nombre no está presente', async () => {
    mockReq.body = { email: 'new@test.com', password: 'pass123' };

    await createUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza si email no está presente', async () => {
    mockReq.body = { nombre: 'User', password: 'pass123' };

    await createUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza si password no está presente', async () => {
    mockReq.body = { nombre: 'User', email: 'test@test.com' };

    await createUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('rechaza si email ya existe', async () => {
    mockDb.get.mockResolvedValue({ id: 1 });

    await createUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Email ya registrado' });
  });
});

describe('users.controller - updateUser', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
      run: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      params: { id: '2' },
      body: { nombre: 'Updated Name', role: 'admin' },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('actualiza un usuario existente', async () => {
    mockDb.get.mockResolvedValue({ id: 2 });
    mockDb.run.mockResolvedValue();

    await updateUser(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('retorna 404 si usuario no existe', async () => {
    mockDb.get.mockResolvedValue(null);

    await updateUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('actualiza password si se proporciona', async () => {
    mockDb.get.mockResolvedValue({ id: 2 });
    mockDb.run.mockResolvedValue();

    const bcrypt = (await import('bcryptjs')).default;
    bcrypt.hash.mockResolvedValue('new-hashed-password');

    mockReq.body.password = 'newpassword123';
    await updateUser(mockReq, mockRes);

    expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
    expect(mockDb.run).toHaveBeenCalled();
  });

  it('convierte activo a 1 o 0 correctamente', async () => {
    mockDb.get.mockResolvedValue({ id: 2 });
    mockDb.run.mockResolvedValue();

    mockReq.body = { activo: true };
    await updateUser(mockReq, mockRes);

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('activo = ?'),
      expect.arrayContaining([1])
    );
  });

  it('maneja errores de base de datos', async () => {
    mockDb.get.mockRejectedValue(new Error('DB Error'));

    await updateUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});

describe('users.controller - deleteUser', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
      run: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      params: { id: '2' },
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('elimina un usuario correctamente', async () => {
    mockDb.get.mockResolvedValue({ id: 2, nombre: 'User to Delete', role: 'empleado' });
    mockDb.run.mockResolvedValue();

    await deleteUser(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM usuarios WHERE id = ?', ['2']);
    expect(auditModule.audit).toHaveBeenCalled();
  });

  it('rechaza auto-eliminación', async () => {
    mockReq.user.id = 1;
    mockReq.params.id = '1';

    await deleteUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No puedes eliminarte a ti mismo' });
  });

  it('retorna 404 si usuario no existe', async () => {
    mockDb.get.mockResolvedValue(null);

    await deleteUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
  });

  it('maneja errores de base de datos', async () => {
    mockDb.get.mockRejectedValue(new Error('DB Error'));

    await deleteUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
