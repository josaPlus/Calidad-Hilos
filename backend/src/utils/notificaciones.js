import Notificacion from '../models/mongo/Notificacion.js';
import { isMongoConnected } from '../config/mongo.js';
import { getSQLite } from '../config/sqlite.js';

/**
 * Crea una notificación para un usuario específico.
 * Fire-and-forget: si Mongo no está disponible, no rompe la operación principal.
 */
export async function notificar({ usuarioId, tipo = 'info', titulo, mensaje, link = '', metadata = {} }) {
  if (!isMongoConnected()) return;
  try {
    await Notificacion.create({ usuarioId, tipo, titulo, mensaje, link, metadata });
  } catch (err) {
    console.warn('Notificación falló (no crítico):', err.message);
  }
}

/**
 * Crea una notificación para TODOS los admins activos.
 */
export async function notificarAdmins({ tipo, titulo, mensaje, link, metadata }) {
  if (!isMongoConnected()) return;
  try {
    const db = getSQLite();
    const admins = await db.all(`SELECT id FROM usuarios WHERE role = 'admin' AND activo = 1`);
    await Promise.all(
      admins.map(a => Notificacion.create({
        usuarioId: a.id, tipo, titulo, mensaje, link: link || '', metadata: metadata || {},
      }))
    );
  } catch (err) {
    console.warn('NotificarAdmins falló:', err.message);
  }
}