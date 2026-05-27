import bcrypt from 'bcryptjs';
import { getSQLite } from '../config/sqlite.js';
import { generateToken } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

export async function register(req, res) {
  try {
    const { nombre, email, password, role } = req.body;
    const db = getSQLite();

    const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe) return res.status(400).json({ error: 'El email ya está registrado' });

    const hashed = await bcrypt.hash(password, 10);
    // Solo el primer usuario o un admin existente puede crear admins
    let finalRole = 'empleado';
    if (role === 'admin') {
      const adminCount = await db.get(`SELECT COUNT(*) AS n FROM usuarios WHERE role='admin'`);
      if (adminCount.n === 0) finalRole = 'admin'; // primer usuario admin
      // Si no, queda como empleado a menos que un admin lo cree (ver endpoint /users)
    }

    const result = await db.run(
      'INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, ?)',
      [nombre, email, hashed, finalRole]
    );

    const user = { id: result.lastID, nombre, email, role: finalRole };
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Error register:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const db = getSQLite();

    const user = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const payload = { id: user.id, nombre: user.nombre, email: user.email, role: user.role };
    const token = generateToken(payload);

    audit({ accion: 'login', entidad: 'usuario', entidadId: user.id, req: { user: payload, ip: req.ip } });

    res.json({ token, user: payload });
  } catch (err) {
    console.error('Error login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

export async function me(req, res) {
  try {
    const db = getSQLite();
    const user = await db.get(
      'SELECT id, nombre, email, role, activo, created_at FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

export async function logout(req, res) {
  audit({ accion: 'logout', entidad: 'usuario', entidadId: req.user.id, req });
  res.json({ ok: true, message: 'Sesión cerrada' });
}
