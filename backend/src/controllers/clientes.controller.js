import { getSQLite } from '../config/sqlite.js';
import { audit } from '../utils/audit.js';
import logger from '../utils/logger.js';

const INACTIVITY_DAYS = 30;

async function actualizarInactividad(db) {
  await db.run(`
    UPDATE clientes
    SET estado_cliente = 'inactivo'
    WHERE estado_cliente = 'activo'
      AND id NOT IN (
        SELECT DISTINCT cliente_id
        FROM notas_remision
        WHERE fecha_venta >= date('now', '-${INACTIVITY_DAYS} days')
      )
      AND id IN (
        SELECT DISTINCT cliente_id FROM notas_remision
      );
  `);
  await db.run(`
    UPDATE clientes
    SET estado_cliente = 'activo'
    WHERE estado_cliente = 'inactivo'
      AND id IN (
        SELECT DISTINCT cliente_id
        FROM notas_remision
        WHERE fecha_venta >= date('now', '-${INACTIVITY_DAYS} days')
      );
  `);
}

export async function listClientes(req, res) {
  const correlationId = req.correlationId;
  try {
    const db = getSQLite();
    await actualizarInactividad(db);

    logger.info(
      { correlationId, userId: req.user.id, action: 'list_clientes' },
      'Listado de clientes consultado'
    );

    const clientes = await db.all(`
      SELECT
        c.*,
        COALESCE(COUNT(nr.id), 0) AS total_ventas,
        COALESCE(SUM(nr.monto_final), 0) AS total_comprado,
        COALESCE(SUM(CASE
          WHEN nr.estado_pago IN ('no_pagado','pendiente_de_completar')
          THEN nr.monto_final - COALESCE(
            (SELECT SUM(monto_pagado) FROM pagos WHERE nota_id = nr.id), 0
          )
          ELSE 0
        END), 0) AS saldo_pendiente,
        MAX(nr.fecha_venta) AS ultima_compra
      FROM clientes c
      LEFT JOIN notas_remision nr ON c.id = nr.cliente_id
      GROUP BY c.id
      ORDER BY c.nombre ASC
    `);

    logger.info(
      { correlationId, userId: req.user.id, total: clientes.length, action: 'list_clientes_success' },
      `Se encontraron ${clientes.length} clientes`
    );

    res.json({ clientes });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'list_clientes_error' }, 'Error al obtener clientes');
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
}

export async function getCliente(req, res) {
  const correlationId = req.correlationId;
  try {
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, clienteId: req.params.id, action: 'get_cliente' },
      'Detalle de cliente consultado'
    );

    const cliente = await db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (!cliente) {
      logger.warn(
        { correlationId, clienteId: req.params.id, action: 'get_cliente_not_found' },
        'Cliente no encontrado'
      );
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const descuentos = await db.all(
      'SELECT * FROM configuracion_descuentos WHERE cliente_id = ? AND activo = 1',
      [req.params.id]
    );

    res.json({ cliente, descuentos });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'get_cliente_error' }, 'Error al obtener cliente');
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
}

export async function createCliente(req, res) {
  const correlationId = req.correlationId;
  try {
    const { nombre, telefono, domicilio, ciudad, email, descuento_global } = req.body;
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, nombre, action: 'create_cliente_attempt' },
      'Intento de crear cliente'
    );

    const result = await db.run(
      `INSERT INTO clientes (nombre, telefono, domicilio, ciudad, email, descuento_global)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, telefono || null, domicilio || null, ciudad || null, email || null, descuento_global || 0]
    );

    logger.info(
      { correlationId, userId: req.user.id, clienteId: result.lastID, nombre, action: 'create_cliente_success' },
      'Cliente creado correctamente'
    );

    audit({ accion: 'crear', entidad: 'cliente', entidadId: result.lastID, req, payload: req.body });

    const cliente = await db.get('SELECT * FROM clientes WHERE id = ?', [result.lastID]);
    res.status(201).json({ cliente });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'create_cliente_error' }, 'Error al crear cliente');
    res.status(500).json({ error: 'Error al crear cliente' });
  }
}

export async function updateCliente(req, res) {
  const correlationId = req.correlationId;
  try {
    const { id } = req.params;
    const { nombre, telefono, domicilio, ciudad, email, estado_cliente, descuento_global } = req.body;
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, clienteId: id, action: 'update_cliente_attempt' },
      'Intento de actualizar cliente'
    );

    const cliente = await db.get('SELECT id FROM clientes WHERE id = ?', [id]);
    if (!cliente) {
      logger.warn(
        { correlationId, clienteId: id, action: 'update_cliente_not_found' },
        'Cliente no encontrado para actualizar'
      );
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await db.run(
      `UPDATE clientes SET
         nombre = COALESCE(?, nombre),
         telefono = COALESCE(?, telefono),
         domicilio = COALESCE(?, domicilio),
         ciudad = COALESCE(?, ciudad),
         email = COALESCE(?, email),
         estado_cliente = COALESCE(?, estado_cliente),
         descuento_global = COALESCE(?, descuento_global),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nombre, telefono, domicilio, ciudad, email, estado_cliente, descuento_global, id]
    );

    logger.info(
      { correlationId, userId: req.user.id, clienteId: id, action: 'update_cliente_success' },
      'Cliente actualizado correctamente'
    );

    audit({ accion: 'actualizar', entidad: 'cliente', entidadId: id, req, payload: req.body });
    const updated = await db.get('SELECT * FROM clientes WHERE id = ?', [id]);
    res.json({ cliente: updated });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'update_cliente_error' }, 'Error al actualizar cliente');
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
}

export async function deleteCliente(req, res) {
  const correlationId = req.correlationId;
  try {
    const { id } = req.params;
    const db = getSQLite();

    logger.warn(
      { correlationId, userId: req.user.id, clienteId: id, action: 'delete_cliente_attempt' },
      'Intento de eliminar cliente'
    );

    const ventas = await db.get(
      'SELECT COUNT(*) AS n FROM notas_remision WHERE cliente_id = ?',
      [id]
    );
    if (ventas.n > 0) {
      logger.warn(
        { correlationId, clienteId: id, totalVentas: ventas.n, action: 'delete_cliente_blocked' },
        'Eliminación de cliente bloqueada por ventas existentes'
      );
      return res.status(400).json({ error: 'No se puede eliminar: el cliente tiene ventas registradas' });
    }

    await db.run('DELETE FROM clientes WHERE id = ?', [id]);

    logger.warn(
      { correlationId, userId: req.user.id, clienteId: id, action: 'delete_cliente_success' },
      'Cliente eliminado'
    );

    audit({ accion: 'eliminar', entidad: 'cliente', entidadId: id, req });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'delete_cliente_error' }, 'Error al eliminar cliente');
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
}

export async function addDescuento(req, res) {
  const correlationId = req.correlationId;
  try {
    const { id } = req.params;
    const { tipo_hilo, cantidad_minima, porcentaje_descuento } = req.body;
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, clienteId: id, porcentaje_descuento, action: 'add_descuento' },
      'Descuento agregado a cliente'
    );

    const result = await db.run(
      `INSERT INTO configuracion_descuentos
        (cliente_id, tipo_hilo, cantidad_minima, porcentaje_descuento)
       VALUES (?, ?, ?, ?)`,
      [id, tipo_hilo || null, cantidad_minima || 0, porcentaje_descuento]
    );

    audit({ accion: 'crear', entidad: 'descuento', entidadId: result.lastID, req, payload: req.body });
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'add_descuento_error' }, 'Error al agregar descuento');
    res.status(500).json({ error: 'Error al agregar descuento' });
  }
}

export async function deleteDescuento(req, res) {
  const correlationId = req.correlationId;
  try {
    const { descuentoId } = req.params;
    const db = getSQLite();

    logger.warn(
      { correlationId, userId: req.user.id, descuentoId, action: 'delete_descuento' },
      'Descuento eliminado'
    );

    await db.run('DELETE FROM configuracion_descuentos WHERE id = ?', [descuentoId]);
    audit({ accion: 'eliminar', entidad: 'descuento', entidadId: descuentoId, req });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ correlationId, err: err.message, action: 'delete_descuento_error' }, 'Error al eliminar descuento');
    res.status(500).json({ error: 'Error al eliminar descuento' });
  }
}