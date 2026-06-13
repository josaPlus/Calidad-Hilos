import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login, me, logout } from '../controllers/auth.controller.js';
import * as authModule from '../middleware/auth.js';
import * as sqliteModule from '../config/sqlite.js';
import * as auditModule from '../utils/audit.js';

// Mocks
vi.mock('../middleware/auth.js');
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
    compare: vi.fn(),
  },
}));

describe('auth.controller - register', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
      run: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);
    authModule.generateToken.mockReturnValue('fake-token');

    mockReq = {
      body: { nombre: 'Test User', email: 'test@example.com', password: 'password123', role: 'empleado' },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('registra un nuevo usuario exitosamente', async () => {
    mockDb.get.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({ lastID: 1 });

    const bcrypt = (await import('bcryptjs')).default;
    bcrypt.hash.mockResolvedValue('hashed-password');

    await register(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'fake-token',
        user: expect.objectContaining({ email: 'test@example.com' }),
      })
    );
  });

  it('rechaza registro si email ya existe', async () => {
    mockDb.get.mockResolvedValue({ id: 1 });

    await register(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'El email ya está registrado' })
    );
  });
});

describe('auth.controller - login', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);
    authModule.generateToken.mockReturnValue('fake-token');

    mockReq = {
      body: { email: 'test@example.com', password: 'password123' },
      correlationId: 'test-correlation-id',
      ip: '127.0.0.1',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('login exitoso con credenciales válidas', async () => {
    mockDb.get.mockResolvedValue({
      id: 1,
      nombre: 'Test User',
      email: 'test@example.com',
      password: 'hashed-password',
      role: 'empleado',
      activo: 1,
    });

    const bcrypt = (await import('bcryptjs')).default;
    bcrypt.compare.mockResolvedValue(true);

    await login(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'fake-token',
        user: expect.objectContaining({ email: 'test@example.com' }),
      })
    );
  });

  it('rechaza login con credenciales inválidas', async () => {
    mockDb.get.mockResolvedValue({
      id: 1,
      nombre: 'Test User',
      email: 'test@example.com',
      password: 'hashed-password',
      role: 'empleado',
      activo: 1,
    });

    const bcrypt = (await import('bcryptjs')).default;
    bcrypt.compare.mockResolvedValue(false);

    await login(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Credenciales inválidas' })
    );
  });

  it('rechaza login si usuario no existe', async () => {
    mockDb.get.mockResolvedValue(null);

    await login(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('rechaza login si usuario está inactivo', async () => {
    mockDb.get.mockResolvedValue({
      id: 1,
      nombre: 'Test User',
      email: 'test@example.com',
      activo: 0,
    });

    await login(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});

describe('auth.controller - me', () => {
  let mockReq, mockRes, mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      get: vi.fn(),
    };
    sqliteModule.getSQLite.mockReturnValue(mockDb);

    mockReq = {
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('retorna datos del usuario autenticado', async () => {
    mockDb.get.mockResolvedValue({
      id: 1,
      nombre: 'Test User',
      email: 'test@example.com',
      role: 'empleado',
      activo: 1,
      created_at: '2024-01-01',
    });

    await me(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ id: 1, email: 'test@example.com' }),
      })
    );
  });

  it('retorna 404 si usuario no existe', async () => {
    mockDb.get.mockResolvedValue(null);

    await me(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });
});

describe('auth.controller - logout', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      user: { id: 1 },
      correlationId: 'test-correlation-id',
    };
    mockRes = {
      json: vi.fn(),
    };
  });

  it('completa logout correctamente', async () => {
    await logout(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ ok: true, message: 'Sesión cerrada' });
    expect(auditModule.audit).toHaveBeenCalled();
  });
});
