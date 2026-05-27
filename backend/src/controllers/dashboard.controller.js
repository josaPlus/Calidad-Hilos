import { getSQLite } from '../config/sqlite.js';
import Egreso from '../models/mongo/Egreso.js';
import { isMongoConnected } from '../config/mongo.js';
import DashboardSnapshot from '../models/mongo/DashboardSnapshot.js';

// ============================================================
// 1) DASHBOARD CLIENTES
// ============================================================
export async function dashboardClientes(req, res) {
  try {
    const db = getSQLite();

    // KPIs principales
    const totales = await db.get(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN estado_cliente='activo' THEN 1 ELSE 0 END) AS activos,
        SUM(CASE WHEN estado_cliente='inactivo' THEN 1 ELSE 0 END) AS inactivos
      FROM clientes
    `);

    // Nuevos en últimos 30 días
    const nuevos = await db.get(`
      SELECT COUNT(*) AS n FROM clientes
      WHERE fecha_registro >= date('now','-30 days')
    `);

    // Recurrentes: clientes con > 1 venta
    const recurrentes = await db.get(`
      SELECT COUNT(*) AS n FROM (
        SELECT cliente_id FROM notas_remision
        GROUP BY cliente_id HAVING COUNT(*) > 1
      )
    `);

    // Crecimiento mensual: clientes nuevos por mes (últimos 12 meses)
    const crecimiento = await db.all(`
      SELECT
        strftime('%Y-%m', fecha_registro) AS mes,
        COUNT(*) AS nuevos
      FROM clientes
      WHERE fecha_registro >= date('now','-12 months')
      GROUP BY mes
      ORDER BY mes ASC
    `);

    // Top 10 clientes por monto
    const topClientes = await db.all(`
      SELECT
        c.id, c.nombre,
        COUNT(nr.id) AS num_compras,
        COALESCE(SUM(nr.monto_final), 0) AS total_comprado
      FROM clientes c
      JOIN notas_remision nr ON nr.cliente_id = c.id
      GROUP BY c.id
      ORDER BY total_comprado DESC
      LIMIT 10
    `);

    // Construir kpis ANTES de usarlos
    const kpis = {
      totalClientes: totales.total || 0,
      activos: totales.activos || 0,
      inactivos: totales.inactivos || 0,
      nuevos: nuevos.n || 0,
      recurrentes: recurrentes.n || 0,
    };

    if (isMongoConnected()) {
      DashboardSnapshot.create({
        tipo: 'clientes',
        rango: 'mes',
        data: { kpis, crecimientoMensual: crecimiento, topClientes },
        usuarioId: req.user.id,
      }).catch(() => { });
    }

    res.json({
      kpis,
      crecimientoMensual: crecimiento,
      topClientes,
    });
  } catch (err) {
    console.error('Error dashboardClientes:', err);
    res.status(500).json({ error: 'Error en dashboard de clientes' });
  }
}

// ============================================================
// 2) DASHBOARD FINANZAS (ingresos + egresos)
// ============================================================
export async function dashboardFinanzas(req, res) {
  try {
    const db = getSQLite();
    const { desde, hasta } = req.query;

    // Por defecto: últimos 90 días
    const fechaDesde = desde || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const fechaHasta = hasta || new Date().toISOString().slice(0, 10);

    // === INGRESOS (SQLite - notas_remision) ===
    const ingresosResumen = await db.get(`
      SELECT
        COALESCE(SUM(monto_final), 0) AS total,
        COUNT(*) AS num_ventas,
        COUNT(DISTINCT cliente_id) AS clientes_unicos
      FROM notas_remision
      WHERE fecha_venta BETWEEN ? AND ?
    `, [fechaDesde, fechaHasta]);

    const ingresosPorDia = await db.all(`
      SELECT fecha_venta AS fecha, SUM(monto_final) AS monto
      FROM notas_remision
      WHERE fecha_venta BETWEEN ? AND ?
      GROUP BY fecha_venta
      ORDER BY fecha_venta ASC
    `, [fechaDesde, fechaHasta]);

    // === EGRESOS (MongoDB) ===
    let egresosResumen = { total: 0, num_egresos: 0 };
    let egresosPorDia = [];
    let topCategorias = [];

    if (isMongoConnected()) {
      const filtro = { fecha: { $gte: new Date(fechaDesde), $lte: new Date(fechaHasta + 'T23:59:59') } };

      const aggrTotales = await Egreso.aggregate([
        { $match: filtro },
        { $group: { _id: null, total: { $sum: '$monto' }, n: { $sum: 1 } } },
      ]);
      if (aggrTotales[0]) {
        egresosResumen = { total: aggrTotales[0].total, num_egresos: aggrTotales[0].n };
      }

      const aggrPorDia = await Egreso.aggregate([
        { $match: filtro },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } },
            monto: { $sum: '$monto' },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      egresosPorDia = aggrPorDia.map(x => ({ fecha: x._id, monto: x.monto }));

      const aggrCats = await Egreso.aggregate([
        { $match: filtro },
        { $group: { _id: '$categoria', total: { $sum: '$monto' }, n: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]);
      topCategorias = aggrCats.map(x => ({ categoria: x._id, total: x.total, n: x.n }));
    }

    // === FLUJO COMBINADO POR DÍA + DÍAS NEGATIVOS ===
    const mapDias = {};
    for (const i of ingresosPorDia) mapDias[i.fecha] = { fecha: i.fecha, ingresos: i.monto, egresos: 0 };
    for (const e of egresosPorDia) {
      if (!mapDias[e.fecha]) mapDias[e.fecha] = { fecha: e.fecha, ingresos: 0, egresos: 0 };
      mapDias[e.fecha].egresos = e.monto;
    }
    const flujoDiario = Object.values(mapDias)
      .map(d => ({ ...d, neto: d.ingresos - d.egresos }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const diasNegativos = flujoDiario
      .filter(d => d.neto < 0)
      .sort((a, b) => a.neto - b.neto)
      .slice(0, 10);

    // KPIs
    const flujoNeto = ingresosResumen.total - egresosResumen.total;
    const promedioPorCliente = ingresosResumen.clientes_unicos
      ? ingresosResumen.total / ingresosResumen.clientes_unicos
      : 0;

    if (isMongoConnected()) {
      DashboardSnapshot.create({
        tipo: 'finanzas',
        rango: 'custom',
        desde: new Date(fechaDesde),
        hasta: new Date(fechaHasta),
        data: { kpis: { totalIngresos: ingresosResumen.total, totalEgresos: egresosResumen.total, flujoNeto, promedioPorCliente }, topCategorias, diasNegativos },
        usuarioId: req.user.id,
      }).catch(() => { });
    }

    res.json({
      periodo: { desde: fechaDesde, hasta: fechaHasta },
      kpis: {
        totalIngresos: ingresosResumen.total,
        totalEgresos: egresosResumen.total,
        flujoNeto,
        numVentas: ingresosResumen.num_ventas,
        numEgresos: egresosResumen.num_egresos,
        clientesUnicos: ingresosResumen.clientes_unicos,
        promedioPorCliente,
      },
      flujoDiario,
      topCategorias,
      diasNegativos,
    });
  } catch (err) {
    console.error('Error dashboardFinanzas:', err);
    res.status(500).json({ error: 'Error en dashboard financiero' });
  }
}

// ============================================================
// 3) DASHBOARD HILOS (top productos)
// ============================================================
export async function dashboardHilos(req, res) {
  try {
    const db = getSQLite();
    const { desde, hasta } = req.query;

    const filtroFechas = (desde && hasta)
      ? `WHERE nr.fecha_venta BETWEEN '${desde}' AND '${hasta}'`
      : '';

    const topHilos = await db.all(`
      SELECT
        d.tipo_hilo,
        SUM(d.cantidad) AS cantidad_total,
        SUM(d.subtotal) AS monto_total,
        COUNT(DISTINCT nr.id) AS num_ventas
      FROM detalles_nota d
      JOIN notas_remision nr ON nr.id = d.nota_id
      ${filtroFechas}
      GROUP BY d.tipo_hilo
      ORDER BY monto_total DESC
    `);

    const totalMonto = topHilos.reduce((s, x) => s + (x.monto_total || 0), 0);
    const totalCantidad = topHilos.reduce((s, x) => s + (x.cantidad_total || 0), 0);

    const conPct = topHilos.map(h => ({
      ...h,
      porcentaje_monto: totalMonto ? +(h.monto_total / totalMonto * 100).toFixed(2) : 0,
      porcentaje_cantidad: totalCantidad ? +(h.cantidad_total / totalCantidad * 100).toFixed(2) : 0,
    }));

    // Construir kpis ANTES de usarlos
    const kpis = {
      totalProductos: topHilos.length,
      totalMontoVendido: totalMonto,
      totalCantidadVendida: totalCantidad,
      topProducto: conPct[0]?.tipo_hilo || 'N/A',
    };

    if (isMongoConnected()) {
      DashboardSnapshot.create({
        tipo: 'hilos',
        rango: desde && hasta ? 'custom' : 'mes',
        desde: desde ? new Date(desde) : undefined,
        hasta: hasta ? new Date(hasta) : undefined,
        data: { kpis, topHilos: conPct },
        usuarioId: req.user.id,
      }).catch(() => { });
    }

    res.json({
      kpis,
      topHilos: conPct,
    });
  } catch (err) {
    console.error('Error dashboardHilos:', err);
    res.status(500).json({ error: 'Error en dashboard de hilos' });
  }
}
