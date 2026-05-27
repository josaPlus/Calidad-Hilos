import AuditLog from '../models/mongo/AuditLog.js';
import { isMongoConnected } from '../config/mongo.js';

/**
 * Registra una acción en el log de auditoría (MongoDB).
 * Es fire-and-forget — si Mongo no está disponible, no rompe la operación.
 */
export async function audit({ accion, entidad, entidadId, req, payload }) {
  if (!isMongoConnected()) return;
  try {
    await AuditLog.create({
      accion,
      entidad,
      entidadId: entidadId != null ? String(entidadId) : undefined,
      usuarioId: req.user?.id,
      usuarioNombre: req.user?.nombre || '',
      rol: req.user?.role || '',
      payload,
      ip: req.ip || req.headers['x-forwarded-for'] || '',
    });
  } catch (err) {
    console.warn('Audit log falló (no crítico):', err.message);
  }
}
