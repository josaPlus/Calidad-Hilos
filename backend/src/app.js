import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pinoHttp from 'pino-http';

import { isMongoConnected } from './config/mongo.js';
import apiRoutes from './routes/index.js';
import logger, { generateCorrelationId } from './utils/logger.js';
import { metricsMiddleware, metricsHandler } from './utils/metrics.js';

const app = express();

app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

app.use(metricsMiddleware);

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.correlationId,
    customLogLevel(req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url, correlationId: req.raw.correlationId };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), sqlite: true, mongo: isMongoConnected() });
});

app.get('/api/metrics', metricsHandler);

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  logger.error({ correlationId: req.correlationId, err: err.message }, 'Error interno');
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;