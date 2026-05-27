import bcrypt from 'bcryptjs';
import { getSQLite } from '../config/sqlite.js';
import { audit } from '../utils/audit.js';

export async function listUsers(req, res) {
  try {
    const db = getSQLite();
    const users = await db.all(
      'SELECT id, nombre, email, role, activo, created_at FROM usuarios ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
}

export async function createUser(req, res) {
  try {
    const { nombre, email, password, role } = req.body;
    const db = getSQLite();

    const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe) return res.status(400).json({ error: 'Email ya registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, ?)',
      [nombre, email, hashed, role || 'empleado']
    );
    audit({ accion: 'crear', entidad: 'usuario', entidadId: result.lastID, req, payload: { email, role } });
    res.status(201).json({
      user: { id: result.lastID, nombre, email, role: role || 'empleado', activo: 1 },
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { nombre, role, activo, password } = req.body;
    const db = getSQLite();

    const user = await db.get('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const sets = [];
    const vals = [];
    if (nombre !== undefined) { sets.push('nombre = ?'); vals.push(nombre); }
    if (role !== undefined)   { sets.push('role = ?');   vals.push(role); }
    if (activo !== undefined) { sets.push('activo = ?'); vals.push(activo ? 1 : 0); }
    if (password)             { sets.push('password = ?'); vals.push(await bcrypt.hash(password, 10)); }
    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(id);

    await db.run(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, vals);
    audit({ accion: 'actualizar', entidad: 'usuario', entidadId: id, req, payload: { nombre, role, activo } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const db = getSQLite();
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    await db.run('DELETE FROM usuarios WHERE id = ?', [id]);
    audit({ accion: 'eliminar', entidad: 'usuario', entidadId: id, req });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
}
