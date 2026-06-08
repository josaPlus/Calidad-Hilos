import Egreso from '../models/mongo/Egreso.js';
import { getSQLite } from '../config/sqlite.js';
import { isMongoConnected } from '../config/mongo.js';
import { audit } from '../utils/audit.js';
import { notificarAdmins } from '../utils/notificaciones.js';
import logger from '../utils/logger.js';

function checkMongo(res, correlationId) {
  if (!isMongoConnected()) {
    logger.error(
      { correlationId, action: 'mongo_not_available' },
      'MongoDB no disponible para operación de egresos'
    );
    res.status(503).json({ error: 'MongoDB no disponible. Inicia mongod o configura MONGO_URI.' });
    return false;
  }
  return true;
}

export async function listEgresos(req, res) {
  const correlationId = req.correlationId;
  if (!checkMongo(res, correlationId)) return;
  try {
    const { desde, hasta, categoria } = req.query;
    const filtro = {};
    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = new Date(desde);
      if (hasta) filtro.fecha.$lte = new Date(hasta);
    }
    if (categoria) filtro.categoria = categoria;

    logger.info(
      { correlationId, userId: req.user.id, filtros: { desde, hasta, categoria }, action: 'list_egresos' },
      'Listado de egresos consultado'
    );

    const egresos = await Egreso.find(filtro).sort({ fecha: -1 }).lean();

    logger.info(
      { correlationId, userId: req.user.id, total: egresos.length, action: 'list_egresos_success' },
      `Se encontraron ${egresos.length} egresos`
    );

    res.json({ egresos });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'list_egresos_error' }, 'Error al listar egresos');
    res.status(500).json({ error: 'Error al listar egresos' });
  }
}

export async function createEgreso(req, res) {
  const correlationId = req.correlationId;
  if (!checkMongo(res, correlationId)) return;
  try {
    const { fecha, categoria, concepto, monto, metodoPago, referencia, observaciones, tags } = req.body;

    logger.info(
      { correlationId, userId: req.user.id, categoria, monto, action: 'create_egreso_attempt' },
      'Intento de crear egreso'
    );

    if (!fecha || !categoria || !concepto || monto == null) {
      logger.warn(
        { correlationId, userId: req.user.id, action: 'create_egreso_invalid' },
        'Datos inválidos para crear egreso'
      );
      return res.status(400).json({ error: 'fecha, categoria, concepto y monto son obligatorios' });
    }

    if (isNaN(monto) || monto < 0) {
      logger.warn(
        { correlationId, userId: req.user.id, monto, action: 'create_egreso_invalid_monto' },
        'Monto inválido en egreso'
      );
      return res.status(400).json({ error: 'monto inválido' });
    }

    const db = getSQLite();
    const cat = await db.get(
      'SELECT id FROM categorias_egreso WHERE nombre = ? AND activo = 1',
      [categoria]
    );
    if (!cat) {
      logger.warn(
        { correlationId, userId: req.user.id, categoria, action: 'create_egreso_invalid_categoria' },
        'Categoría de egreso no válida'
      );
      return res.status(400).json({ error: 'Categoría no válida. Consulta /api/categorias-egreso.' });
    }

    const doc = await Egreso.create({
      fecha: new Date(fecha),
      categoria,
      concepto,
      monto: parseFloat(monto),
      metodoPago: metodoPago || 'efectivo',
      referencia: referencia || '',
      observaciones: observaciones || '',
      tags: Array.isArray(tags) ? tags : [],
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre || '',
    });

    logger.info(
      {
        correlationId,
        userId: req.user.id,
        egresoId: doc._id,
        categoria,
        monto: parseFloat(monto),
        action: 'create_egreso_success',
      },
      `Egreso creado: ${concepto} por $${parseFloat(monto).toFixed(2)}`
    );

    audit({ accion: 'crear', entidad: 'egreso', entidadId: doc._id, req,
            payload: { categoria, concepto, monto } });

    if (parseFloat(monto) >= 3000) {
      logger.warn(
        { correlationId, userId: req.user.id, monto: parseFloat(monto), categoria, action: 'create_egreso_large' },
        'Egreso de monto alto registrado'
      );
      notificarAdmins({
        tipo: 'warning',
        titulo: 'Egreso importante',
        mensaje: `${req.user.nombre} registró un egreso de $${parseFloat(monto).toFixed(2)} en ${categoria}`,
        link: '/egresos',
        metadata: { egresoId: doc._id, monto },
      });
    }

    res.status(201).json({ egreso: doc });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'create_egreso_error' }, 'Error al crear egreso');
    res.status(500).json({ error: 'Error al crear egreso' });
  }
}

export async function deleteEgreso(req, res) {
  const correlationId = req.correlationId;
  if (!checkMongo(res, correlationId)) return;
  try {
    logger.warn(
      { correlationId, userId: req.user.id, egresoId: req.params.id, action: 'delete_egreso_attempt' },
      'Intento de eliminar egreso'
    );

    await Egreso.findByIdAndDelete(req.params.id);

    logger.warn(
      { correlationId, userId: req.user.id, egresoId: req.params.id, action: 'delete_egreso_success' },
      'Egreso eliminado'
    );

    audit({ accion: 'eliminar', entidad: 'egreso', entidadId: req.params.id, req });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'delete_egreso_error' }, 'Error al eliminar egreso');
    res.status(500).json({ error: 'Error al eliminar egreso' });
  }
}

export async function listCategorias(req, res) {
  const correlationId = req.correlationId;
  try {
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, action: 'list_categorias' },
      'Categorias de egreso consultadas'
    );

    const categorias = await db.all(
      'SELECT * FROM categorias_egreso WHERE activo = 1 ORDER BY nombre'
    );

    res.json({ categorias });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'list_categorias_error' }, 'Error al listar Categorias');
    res.status(500).json({ error: 'Error al listar Categorias' });
  }
}