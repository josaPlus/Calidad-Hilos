import { config } from 'dotenv';
config();

import { initSQLite, closeSQLite } from './config/sqlite.js';
import { initMongo, closeMongo, isMongoConnected } from './config/mongo.js';
import logger from './utils/logger.js';
import app from './app.js';

const PORT = process.env.PORT || 3001;

async function start() {
  await initSQLite();
  logger.info('SQLite inicializado');

  await initMongo();
  logger.info({ mongoConectado: isMongoConnected() }, 'MongoDB inicializado');

  app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, `Backend corriendo en http://localhost:${PORT}`);
  });
}

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