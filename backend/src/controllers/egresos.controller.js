import Egreso from '../models/mongo/Egreso.js';
import { getSQLite } from '../config/sqlite.js';
import { isMongoConnected } from '../config/mongo.js';
import { audit } from '../utils/audit.js';
import { notificarAdmins } from '../utils/notificaciones.js';

function checkMongo(res) {
  if (!isMongoConnected()) {
    res.status(503).json({ error: 'MongoDB no disponible. Inicia mongod o configura MONGO_URI.' });
    return false;
  }
  return true;
}

export async function listEgresos(req, res) {
  if (!checkMongo(res)) return;
  try {
    const { desde, hasta, categoria } = req.query;
    const filtro = {};
    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = new Date(desde);
      if (hasta) filtro.fecha.$lte = new Date(hasta);
    }
    if (categoria) filtro.categoria = categoria;

    const egresos = await Egreso.find(filtro).sort({ fecha: -1 }).lean();
    res.json({ egresos });
  } catch (err) {
    res.status(500).json({ error: 'Error al listar egresos' });
  }
}

export async function createEgreso(req, res) {
  if (!checkMongo(res)) return;
  try {
    const { fecha, categoria, concepto, monto, metodoPago, referencia, observaciones, tags } = req.body;

    if (!fecha || !categoria || !concepto || monto == null) {
      return res.status(400).json({ error: 'fecha, categoria, concepto y monto son obligatorios' });
    }
    if (isNaN(monto) || monto < 0) {
      return res.status(400).json({ error: 'monto inválido' });
    }

    // Validar categoría contra catálogo SQL
    const db = getSQLite();
    const cat = await db.get(
      'SELECT id FROM categorias_egreso WHERE nombre = ? AND activo = 1',
      [categoria]
    );
    if (!cat) {
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

    audit({ accion: 'crear', entidad: 'egreso', entidadId: doc._id, req,
            payload: { categoria, concepto, monto } });

    if (parseFloat(monto) >= 3000) {
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
    console.error('Error createEgreso:', err);
    res.status(500).json({ error: 'Error al crear egreso' });
  }
}

export async function deleteEgreso(req, res) {
  if (!checkMongo(res)) return;
  try {
    await Egreso.findByIdAndDelete(req.params.id);
    audit({ accion: 'eliminar', entidad: 'egreso', entidadId: req.params.id, req });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar egreso' });
  }
}

export async function listCategorias(req, res) {
  try {
    const db = getSQLite();
    const categorias = await db.all(
      'SELECT * FROM categorias_egreso WHERE activo = 1 ORDER BY nombre'
    );
    res.json({ categorias });
  } catch (err) {
    res.status(500).json({ error: 'Error al listar categorías' });
  }
}
