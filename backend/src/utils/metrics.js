import logger from './logger.js';

/**
 * RED Metrics (Rate, Errors, Duration) por endpoint — requerido por checklist 11.1
 *
 * Acumula en memoria, por método+ruta:
 *  - Rate: total de requests y requests por minuto desde el arranque
 *  - Errors: % de respuestas con status >= 500
 *  - Duration: promedio y máximo en ms
 *
 * No requiere servicios externos (Prometheus/Grafana): se expone vía
 * GET /api/metrics, pensado para consumo manual o por un scraper simple.
 */

const startedAt = Date.now();

// Map<"METHOD /ruta", { count, errors, totalDurationMs, maxDurationMs }>
const metricsStore = new Map();

function normalizeRoute(req) {
  // Usa la ruta registrada en Express cuando existe (evita que /clientes/1 y
  // /clientes/2 cuenten como endpoints distintos); si no, usa la URL cruda.
  const routePath = req.route?.path
    ? `${req.baseUrl || ''}${req.route.path}`
    : req.path;
  return `${req.method} ${routePath}`;
}

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const key = normalizeRoute(req);

    const entry = metricsStore.get(key) || { count: 0, errors: 0, totalDurationMs: 0, maxDurationMs: 0 };
    entry.count += 1;
    entry.totalDurationMs += durationMs;
    entry.maxDurationMs = Math.max(entry.maxDurationMs, durationMs);
    if (res.statusCode >= 500) entry.errors += 1;

    metricsStore.set(key, entry);
  });

  next();
}

export function getMetricsSnapshot() {
  const uptimeMinutes = Math.max((Date.now() - startedAt) / 60000, 1 / 60);

  const endpoints = Array.from(metricsStore.entries()).map(([endpoint, e]) => ({
    endpoint,
    rate_req_per_min: +(e.count / uptimeMinutes).toFixed(2),
    total_requests: e.count,
    errors_pct: e.count ? +((e.errors / e.count) * 100).toFixed(2) : 0,
    duration_avg_ms: e.count ? +(e.totalDurationMs / e.count).toFixed(2) : 0,
    duration_max_ms: +e.maxDurationMs.toFixed(2),
  }));

  return {
    uptime_seconds: +((Date.now() - startedAt) / 1000).toFixed(0),
    generated_at: new Date().toISOString(),
    endpoints: endpoints.sort((a, b) => b.total_requests - a.total_requests),
  };
}

export function metricsHandler(req, res) {
  const correlationId = req.correlationId;
  const snapshot = getMetricsSnapshot();

  logger.info(
    { correlationId, action: 'metrics_consultadas', totalEndpoints: snapshot.endpoints.length },
    'RED metrics consultadas'
  );

  res.json(snapshot);
}