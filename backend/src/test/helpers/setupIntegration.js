import { vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initSQLite, closeSQLite } from '../../config/sqlite.js';
import app from '../../app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB_PATH = path.join(__dirname, 'test_integration.db');

vi.mock('../../config/mongo.js', () => ({
  initMongo: vi.fn(),
  closeMongo: vi.fn(),
  isMongoConnected: vi.fn().mockReturnValue(false),
}));

vi.mock('../../utils/audit.js', () => ({
  audit: vi.fn(),
}));

vi.mock('../../utils/notificaciones.js', () => ({
  notificar: vi.fn(),
  notificarAdmins: vi.fn(),
}));

export async function setupTestDB() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  process.env.SQLITE_PATH = TEST_DB_PATH;
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRATION = '1h';
  await initSQLite();
}

export async function teardownTestDB() {
  await closeSQLite();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
}

export { app };