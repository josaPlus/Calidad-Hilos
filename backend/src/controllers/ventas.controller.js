import { getSQLite } from '../config/sqlite.js';
import { validators } from '../middleware/validator.js';
import { audit } from '../utils/audit.js';
import { notificar, notificarAdmins } from '../utils/notificaciones.js';

export async function proximoNumero(req, res) {
  try {
    const db = getSQLite();
    const r = await db.get('SELECT COALESCE(MAX(numero_nota), 0) AS m FROM notas_remision');
    res.json({ proximoNumero: r.m + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
}

export async function listVentas(req, res) {
  try {
    const { clienteId, estadoPago, desde, hasta } = req.query;
    const db = getSQLite();

    let sql = `
      SELECT
        nr.*,
        c.nombre AS cliente_nombre,
        u.nombre AS usuario_nombre,
        COALESCE((SELECT SUM(monto_pagado) FROM pagos WHERE nota_id = nr.id), 0) AS total_pagado,
        nr.monto_final - COALESCE((SELECT SUM(monto_pagado) FROM pagos WHERE nota_id = nr.id), 0) AS monto_pendiente
      FROM notas_remision nr
      JOIN clientes c ON c.id = nr.cliente_id
      JOIN usuarios u ON u.id = nr.usuario_id
      WHERE 1=1
    `;
    const params = [];
    if (clienteId)  { sql += ' AND nr.cliente_id = ?'; params.push(clienteId); }
    if (estadoPago) { sql += ' AND nr.estado_pago = ?'; params.push(estadoPago); }
    if (desde)      { sql += ' AND nr.fecha_venta >= ?'; params.push(desde); }
    if (hasta)      { sql += ' AND nr.fecha_venta <= ?'; params.push(hasta); }
    sql += ' ORDER BY nr.fecha_venta DESC, nr.numero_nota DESC';

    const notas = await db.all(sql, params);

    if (notas.length) {
      const ids = notas.map(n => n.id);
      const placeholders = ids.map(() => '?').join(',');
      const detalles = await db.all(
        `SELECT * FROM detalles_nota WHERE nota_id IN (${placeholders})`,
        ids
      );
      const byId = {};
      for (const d of detalles) (byId[d.nota_id] ||= []).push(d);
      for (const n of notas) n.detalles = byId[n.id] || [];
    }

    res.json({ notas });
  } catch (err) {
    console.error('Error listVentas:', err);
    res.status(500).json({ error: 'Error al listar ventas' });
  }
}

export async function getVenta(req, res) {
  try {
    const db = getSQLite();
    const nota = await db.get(
      `SELECT nr.*, c.nombre AS cliente_nombre, u.nombre AS usuario_nombre,
              COALESCE((SELECT SUM(monto_pagado) FROM pagos WHERE nota_id = nr.id),0) AS total_pagado,
              nr.monto_final - COALESCE((SELECT SUM(monto_pagado) FROM pagos WHERE nota_id = nr.id),0) AS monto_pendiente
       FROM notas_remision nr
       JOIN clientes c ON c.id = nr.cliente_id
       JOIN usuarios u ON u.id = nr.usuario_id
       WHERE nr.id = ?`,
      [req.params.id]
    );
    if (!nota) return res.status(404).json({ error: 'Venta no encontrada' });

    nota.detalles = await db.all('SELECT * FROM detalles_nota WHERE nota_id = ?', [nota.id]);
    nota.cliente  = await db.get('SELECT * FROM clientes WHERE id = ?', [nota.cliente_id]);

    res.json({ nota });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener venta' });
  }
}

export async function createVenta(req, res) {
  const db = getSQLite();
  try {
    const { clienteId, fechaVenta, estadoPago, metodoPago, descuentoPorcentaje, notas, detalles } = req.body;

    if (!clienteId || !fechaVenta || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }
    if (!validators.estadoPago(estadoPago)) {
      return res.status(400).json({ error: 'estadoPago inválido' });
    }
    if (estadoPago === 'pagado' && !validators.metodoPago(metodoPago)) {
      return res.status(400).json({ error: 'metodoPago inválido' });
    }

    // Validar detalles
    let subtotal = 0;
    for (const d of detalles) {
      if (!d.tipo_hilo) return res.status(400).json({ error: 'tipo_hilo requerido' });
      if (!validators.cantidad(d.cantidad)) return res.status(400).json({ error: 'cantidad inválida' });
      if (!validators.precio(d.precio_unitario)) return res.status(400).json({ error: 'precio inválido' });
      subtotal += parseFloat(d.cantidad) * parseFloat(d.precio_unitario);
    }

    // Descuento: el mayor entre el manual y el global del cliente
    const cliente = await db.get('SELECT descuento_global FROM clientes WHERE id = ?', [clienteId]);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const descManual = Math.max(0, Math.min(100, parseFloat(descuentoPorcentaje || 0)));
    const descGlobal = parseFloat(cliente.descuento_global || 0);
    const descPct = Math.max(descManual, descGlobal);
    const descuentoAplicado = subtotal * (descPct / 100);
    const montoFinal = subtotal - descuentoAplicado;

    // Próximo número de nota
    const maxR = await db.get('SELECT COALESCE(MAX(numero_nota), 0) AS m FROM notas_remision');
    const numeroNota = maxR.m + 1;

    await db.exec('BEGIN');

    const nota = await db.run(
      `INSERT INTO notas_remision
         (usuario_id, cliente_id, numero_nota, fecha_venta, estado_pago,
          monto_total, descuento_aplicado, monto_final, metodo_pago, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, clienteId, numeroNota, fechaVenta, estadoPago,
       subtotal, descuentoAplicado, montoFinal, metodoPago || null, notas || null]
    );

    for (const d of detalles) {
      const sub = parseFloat(d.cantidad) * parseFloat(d.precio_unitario);
      await db.run(
        `INSERT INTO detalles_nota (nota_id, producto_id, tipo_hilo, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nota.lastID, d.producto_id || null, d.tipo_hilo, d.cantidad, d.precio_unitario, sub]
      );
    }

    if (estadoPago === 'pagado') {
      await db.run(
        `INSERT INTO pagos (nota_id, usuario_id, monto_pagado, metodo_pago, fecha_pago)
         VALUES (?, ?, ?, ?, ?)`,
        [nota.lastID, req.user.id, montoFinal, metodoPago, fechaVenta]
      );
    }

    await db.exec('COMMIT');

    // Notificar al vendedor
    notificar({
      usuarioId: req.user.id,
      tipo: 'success',
      titulo: 'Venta registrada',
      mensaje: `Nota #${numeroNota} creada por $${montoFinal.toFixed(2)}`,
      link: '/ventas',
      metadata: { notaId: nota.lastID, montoFinal },
    });

    // Avisar a admins si la venta es grande
    if (montoFinal >= 5000) {
      notificarAdmins({
        tipo: 'info',
        titulo: 'Venta importante',
        mensaje: `${req.user.nombre} registró la nota #${numeroNota} por $${montoFinal.toFixed(2)}`,
        link: '/ventas',
        metadata: { notaId: nota.lastID, montoFinal },
      });
    }

    audit({ accion: 'crear', entidad: 'venta', entidadId: nota.lastID, req,
            payload: { numeroNota, clienteId, montoFinal, estadoPago } });

    res.status(201).json({
      nota: { id: nota.lastID, numero_nota: numeroNota, monto_final: montoFinal, estado_pago: estadoPago },
    });
  } catch (err) {
    await db.exec('ROLLBACK').catch(() => {});
    console.error('Error createVenta:', err);
    res.status(500).json({ error: 'Error al crear venta' });
  }
}

export async function updateVenta(req, res) {
  try {
    const { id } = req.params;
    const { estadoPago, metodoPago, notas } = req.body;
    const db = getSQLite();

    const nota = await db.get('SELECT * FROM notas_remision WHERE id = ?', [id]);
    if (!nota) return res.status(404).json({ error: 'Venta no encontrada' });

    if (estadoPago === 'pagado' && nota.estado_pago !== 'pagado') {
      const pagado = await db.get(
        'SELECT COALESCE(SUM(monto_pagado),0) AS s FROM pagos WHERE nota_id = ?',
        [id]
      );
      const pendiente = nota.monto_final - pagado.s;
      if (pendiente > 0) {
        if (!validators.metodoPago(metodoPago)) {
          return res.status(400).json({ error: 'metodoPago requerido para pagar' });
        }
        await db.run(
          `INSERT INTO pagos (nota_id, usuario_id, monto_pagado, metodo_pago, fecha_pago, notas)
           VALUES (?, ?, ?, ?, date('now'), 'Pago registrado desde edición')`,
          [id, req.user.id, pendiente, metodoPago]
        );
      }
    }

    await db.run(
      `UPDATE notas_remision SET
         estado_pago = COALESCE(?, estado_pago),
         metodo_pago = COALESCE(?, metodo_pago),
         notas = COALESCE(?, notas),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [estadoPago, metodoPago, notas, id]
    );

    audit({ accion: 'actualizar', entidad: 'venta', entidadId: id, req, payload: req.body });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updateVenta:', err);
    res.status(500).json({ error: 'Error al actualizar venta' });
  }
}

export async function deleteVenta(req, res) {
  try {
    const { id } = req.params;
    const db = getSQLite();
    const nota = await db.get('SELECT * FROM notas_remision WHERE id = ?', [id]);
    if (!nota) return res.status(404).json({ error: 'Venta no encontrada' });
    if (nota.estado_pago === 'pagado') {
      return res.status(400).json({ error: 'No se puede eliminar una venta pagada' });
    }
    await db.run('DELETE FROM notas_remision WHERE id = ?', [id]);
    audit({ accion: 'eliminar', entidad: 'venta', entidadId: id, req });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar venta' });
  }
}
