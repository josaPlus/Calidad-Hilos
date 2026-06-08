import bcrypt from 'bcryptjs';
import { getSQLite } from '../config/sqlite.js';
import { audit } from '../utils/audit.js';
import logger from '../utils/logger.js';

export async function listUsers(req, res) {
  const correlationId = req.correlationId;
  try {
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, action: 'list_users' },
      'Listado de usuarios consultado'
    );

    const users = await db.all(
      'SELECT id, nombre, email, role, activo, created_at FROM usuarios ORDER BY created_at DESC'
    );

    logger.info(
      { correlationId, userId: req.user.id, total: users.length, action: 'list_users_success' },
      `Se encontraron ${users.length} usuarios`
    );

    res.json({ users });
  } catch (err) {
    logger.error(
      { correlationId, err: err.message, action: 'list_users_error' },
      'Error al listar usuarios'
    );
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
}

export async function createUser(req, res) {
  const correlationId = req.correlationId;
  try {
    const { nombre, email, password, role } = req.body;
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, role, action: 'create_user_attempt' },
      'Intento de crear usuario'
    );

    if (!nombre || !email || !password) {
      logger.warn(
        { correlationId, userId: req.user.id, action: 'create_user_invalid' },
        'Datos inválidos para crear usuario'
      );
      return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
    }

    const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe) {
      logger.warn(
        { correlationId, userId: req.user.id, action: 'create_user_duplicate' },
        'Email de usuario ya registrado'
      );
      return res.status(400).json({ error: 'Email ya registrado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, ?)',
      [nombre, email, hashed, role || 'empleado']
    );

    logger.info(
      {
        correlationId,
        userId: req.user.id,
        nuevoUsuarioId: result.lastID,
        nombre,
        role: role || 'empleado',
        action: 'create_user_success',
      },
      `Usuario creado: ${nombre} con rol ${role || 'empleado'}`
    );

    audit({
      accion: 'crear',
      entidad: 'usuario',
      entidadId: result.lastID,
      req,
      payload: { email, role },
    });

    res.status(201).json({
      user: { id: result.lastID, nombre, email, role: role || 'empleado', activo: 1 },
    });
  } catch (err) {
    logger.error(
      { correlationId, err: err.message, action: 'create_user_error' },
      'Error al crear usuario'
    );
    res.status(500).json({ error: 'Error al crear usuario' });
  }
}

export async function updateUser(req, res) {
  const correlationId = req.correlationId;
  try {
    const { id } = req.params;
    const { nombre, role, activo, password } = req.body;
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, targetUserId: id, role, activo, action: 'update_user_attempt' },
      'Intento de actualizar usuario'
    );

    const user = await db.get('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!user) {
      logger.warn(
        { correlationId, userId: req.user.id, targetUserId: id, action: 'update_user_not_found' },
        'Usuario no encontrado para actualizar'
      );
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const sets = [];
    const vals = [];
    if (nombre !== undefined)  { sets.push('nombre = ?');   vals.push(nombre); }
    if (role !== undefined)    { sets.push('role = ?');     vals.push(role); }
    if (activo !== undefined)  { sets.push('activo = ?');   vals.push(activo ? 1 : 0); }
    if (password) {
      sets.push('password = ?');
      vals.push(await bcrypt.hash(password, 10));
      logger.warn(
        { correlationId, userId: req.user.id, targetUserId: id, action: 'update_user_password_change' },
        'Contraseña de usuario actualizada'
      );
    }
    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(id);

    await db.run(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, vals);

    logger.info(
      {
        correlationId,
        userId: req.user.id,
        targetUserId: id,
        cambios: { nombre, role, activo },
        action: 'update_user_success',
      },
      'Usuario actualizado correctamente'
    );

    audit({
      accion: 'actualizar',
      entidad: 'usuario',
      entidadId: id,
      req,
      payload: { nombre, role, activo },
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error(
      { correlationId, err: err.message, action: 'update_user_error' },
      'Error al actualizar usuario'
    );
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
}

export async function deleteUser(req, res) {
  const correlationId = req.correlationId;
  try {
    const { id } = req.params;
    const db = getSQLite();

    logger.warn(
      { correlationId, userId: req.user.id, targetUserId: id, action: 'delete_user_attempt' },
      'Intento de eliminar usuario'
    );

    if (parseInt(id) === req.user.id) {
      logger.warn(
        { correlationId, userId: req.user.id, action: 'delete_user_self' },
        'Intento de auto-eliminación bloqueado'
      );
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    const user = await db.get(
      'SELECT id, nombre, role FROM usuarios WHERE id = ?',
      [id]
    );
    if (!user) {
      logger.warn(
        { correlationId, userId: req.user.id, targetUserId: id, action: 'delete_user_not_found' },
        'Usuario no encontrado para eliminar'
      );
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await db.run('DELETE FROM usuarios WHERE id = ?', [id]);

    logger.warn(
      {
        correlationId,
        userId: req.user.id,
        targetUserId: id,
        nombreEliminado: user.nombre,
        roleEliminado: user.role,
        action: 'delete_user_success',
      },
      `Usuario ${user.nombre} eliminado`
    );

    audit({ accion: 'eliminar', entidad: 'usuario', entidadId: id, req });
    res.json({ ok: true });
  } catch (err) {
    logger.error(
      { correlationId, err: err.message, action: 'delete_user_error' },
      'Error al eliminar usuario'
    );
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
}