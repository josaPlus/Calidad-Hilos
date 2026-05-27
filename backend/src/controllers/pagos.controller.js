import { getSQLite } from '../config/sqlite.js';
import { validators } from '../middleware/validator.js';
import { audit } from '../utils/audit.js';
import { notificar } from '../utils/notificaciones.js';

export async function listPagos(req, res) {
  try {
    const db = getSQLite();
    const pagos = await db.all(`
      SELECT p.*, nr.numero_nota, c.nombre AS cliente_nombre
      FROM pagos p
      JOIN notas_remision nr ON nr.id = p.nota_id
      JOIN clientes c ON c.id = nr.cliente_id
      ORDER BY p.fecha_pago DESC, p.id DESC
    `);
    res.json({ pagos });
  } catch (err) {
    res.status(500).json({ error: 'Error al listar pagos' });
  }
}

export async function saldosPendientes(req, res) {
  try {
    const db = getSQLite();
    const saldos = await db.all(`
      SELECT
        c.id AS cliente_id,
        c.nombre AS nombre_cliente,
        c.telefono,
        COALESCE(SUM(nr.monto_final), 0) AS monto_total,
        COALESCE(SUM(CASE
          WHEN nr.estado_pago IN ('no_pagado','pendiente_de_completar')
          THEN nr.monto_final - COALESCE((SELECT SUM(monto_pagado) FROM pagos WHERE nota_id = nr.id), 0)
          ELSE 0
        END), 0) AS monto_pendiente,
        MAX(nr.fecha_venta) AS ultima_compra
      FROM clientes c
      LEFT JOIN notas_remision nr ON c.id = nr.cliente_id
      GROUP BY c.id
      HAVING monto_pendiente > 0
      ORDER BY monto_pendiente DESC
    `);
    res.json({ saldos });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener saldos' });
  }
}

export async function registrarPago(req, res) {
  try {
    const { notaId, montoPagado, metodoPago, fechaPago, referencia, notas } = req.body;
    const db = getSQLite();

    if (!notaId || !validators.precio(montoPagado) || !validators.metodoPago(metodoPago) || !fechaPago) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const nota = await db.get('SELECT * FROM notas_remision WHERE id = ?', [notaId]);
    if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });

    const prev = await db.get(
      'SELECT COALESCE(SUM(monto_pagado),0) AS s FROM pagos WHERE nota_id = ?',
      [notaId]
    );
    const pendiente = nota.monto_final - prev.s;
    if (parseFloat(montoPagado) > pendiente + 0.01) {
      return res.status(400).json({ error: `Monto mayor al pendiente ($${pendiente.toFixed(2)})` });
    }

    const result = await db.run(
      `INSERT INTO pagos (nota_id, usuario_id, monto_pagado, metodo_pago, fecha_pago, referencia, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [notaId, req.user.id, montoPagado, metodoPago, fechaPago, referencia || null, notas || null]
    );

    const nuevoPendiente = pendiente - montoPagado;
    let nuevoEstado;
    if (nuevoPendiente <= 0.01) nuevoEstado = 'pagado';
    else if (prev.s + parseFloat(montoPagado) > 0) nuevoEstado = 'pendiente_de_completar';
    else nuevoEstado = 'no_pagado';

    await db.run(
      'UPDATE notas_remision SET estado_pago = ? WHERE id = ?',
      [nuevoEstado, notaId]
    );

    notificar({
      usuarioId: req.user.id,
      tipo: 'success',
      titulo: 'Pago registrado',
      mensaje: `Pago de $${parseFloat(montoPagado).toFixed(2)} a la nota #${nota.numero_nota}`,
      link: '/pagos',
      metadata: { notaId, monto: montoPagado },
    });

    audit({ accion: 'crear', entidad: 'pago', entidadId: result.lastID, req,
            payload: { notaId, montoPagado } });

    res.status(201).json({ id: result.lastID, nuevoEstado });
  } catch (err) {
    console.error('Error registrarPago:', err);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
}
