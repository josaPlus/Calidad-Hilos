import bcrypt from 'bcryptjs';
import { getSQLite } from '../config/sqlite.js';
import { generateToken } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';
import logger from '../utils/logger.js';

export async function register(req, res) {
  const correlationId = req.correlationId;
  try {
    const { nombre, email, password, role } = req.body;
    const db = getSQLite();

    logger.info({ correlationId, email, action: 'register_attempt' }, 'Intento de registro');

    const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe) {
      logger.warn({ correlationId, email, action: 'register_duplicate' }, 'Email ya registrado');
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    let finalRole = 'empleado';
    if (role === 'admin') {
      const adminCount = await db.get(`SELECT COUNT(*) AS n FROM usuarios WHERE role='admin'`);
      if (adminCount.n === 0) finalRole = 'admin';
    }

    const result = await db.run(
      'INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, ?)',
      [nombre, email, hashed, finalRole]
    );

    logger.info(
      { correlationId, userId: result.lastID, role: finalRole, action: 'register_success' },
      'Usuario registrado correctamente'
    );

    const user = { id: result.lastID, nombre, email, role: finalRole };
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'register_error' }, 'Error al registrar usuario');
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

export async function login(req, res) {
  const correlationId = req.correlationId;
  try {
    const { email, password } = req.body;
    const db = getSQLite();

    logger.info({ correlationId, action: 'login_attempt' }, 'Intento de login');

    const user = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (!user || !user.activo) {
      logger.warn(
        { correlationId, action: 'login_failed', reason: !user ? 'usuario_no_existe' : 'usuario_inactivo' },
        'Login fallido'
      );
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      logger.warn(
        { correlationId, userId: user.id, action: 'login_wrong_password' },
        'Contraseña incorrecta'
      );
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = { id: user.id, nombre: user.nombre, email: user.email, role: user.role };
    const token = generateToken(payload);

    logger.info(
      { correlationId, userId: user.id, role: user.role, action: 'login_success' },
      'Login exitoso'
    );

    audit({ accion: 'login', entidad: 'usuario', entidadId: user.id, req: { user: payload, ip: req.ip } });
    res.json({ token, user: payload });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'login_error' }, 'Error en login');
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

export async function me(req, res) {
  const correlationId = req.correlationId;
  try {
    const db = getSQLite();
    const user = await db.get(
      'SELECT id, nombre, email, role, activo, created_at FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      logger.warn({ correlationId, userId: req.user.id, action: 'me_not_found' }, 'Usuario no encontrado');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    logger.info({ correlationId, userId: user.id, action: 'me_success' }, 'Perfil consultado');
    res.json({ user });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'me_error' }, 'Error al obtener perfil');
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

export async function logout(req, res) {
  const correlationId = req.correlationId;
  logger.info(
    { correlationId, userId: req.user.id, action: 'logout' },
    'Usuario cerró sesión'
  );
  audit({ accion: 'logout', entidad: 'usuario', entidadId: req.user.id, req });
  res.json({ ok: true, message: 'Sesión cerrada' });
}