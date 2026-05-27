import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia_esta_clave';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  });
}

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  const token = auth.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, nombre, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function soloAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  }
  next();
}

// admin + empleado pueden registrar ventas y egresos
export function adminOEmpleado(req, res, next) {
  if (!['admin', 'empleado'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}
