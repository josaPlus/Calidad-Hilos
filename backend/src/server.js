import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from 'dotenv';

import { initSQLite, closeSQLite } from './config/sqlite.js';
import { initMongo, closeMongo, isMongoConnected } from './config/mongo.js';
import apiRoutes from './routes/index.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Logging mínimo
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sqlite: true,
    mongo: isMongoConnected(),
  });
});

app.use('/api', apiRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, _req, res, _next) => {
  console.error('Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function start() {
  await initSQLite();
  await initMongo();      // tolerante a fallos
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend en http://localhost:${PORT}`);
  });
}

process.on('SIGINT', async () => {
  console.log('\n📴 Cerrando…');
  await closeSQLite();
  await closeMongo();
  process.exit(0);
});

start().catch((e) => {
  console.error('❌ Error al iniciar:', e);
  process.exit(1);
});
