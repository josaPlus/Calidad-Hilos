import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import pinoHttp from 'pino-http';

import { initSQLite, closeSQLite } from './config/sqlite.js';
import { initMongo, closeMongo, isMongoConnected } from './config/mongo.js';
import apiRoutes from './routes/index.js';
import logger, { generateCorrelationId } from './utils/logger.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware: Correlation ID ───────────────────────────────────────────────
// Agrega un ID único a cada request para rastrear todo su ciclo de vida
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

// ─── Middleware: Pino HTTP Logger ─────────────────────────────────────────────
// Loguea automáticamente cada request con método, ruta, status y tiempo
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.correlationId,
    customLogLevel(req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage(req, res) {
      return `${req.method} ${req.url} completado`;
    },
    customErrorMessage(req, res, err) {
      return `${req.method} ${req.url} falló: ${err.message}`;
    },
    // No loguear datos sensibles del body
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          correlationId: req.raw.correlationId,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

// ─── Middleware: CORS y Body Parser ──────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// ─── Status endpoint ──────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  logger.info({ correlationId: req.correlationId }, 'Status check solicitado');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sqlite: true,
    mongo: isMongoConnected(),
  });
});

// ─── Rutas principales ────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn(
    { correlationId: req.correlationId, url: req.url, method: req.method },
    'Ruta no encontrada'
  );
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── Error global ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(
    {
      correlationId: req.correlationId,
      err: { message: err.message, stack: err.stack },
      url: req.url,
      method: req.method,
    },
    'Error interno del servidor'
  );
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────
async function start() {
  await initSQLite();
  logger.info('SQLite inicializado');

  await initMongo();
  logger.info({ mongoConectado: isMongoConnected() }, 'MongoDB inicializado');

  app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, `Backend corriendo en http://localhost:${PORT}`);
  });
}

// ─── Cierre limpio ────────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  logger.warn('Señal SIGINT recibida, cerrando servidor...');
  await closeSQLite();
  await closeMongo();
  logger.info('Servidor cerrado correctamente');
  process.exit(0);
});

start().catch((e) => {
  logger.error({ err: e }, 'Error crítico al iniciar el servidor');
  process.exit(1);
});