import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export async function initSQLite() {
  const dbPath = process.env.SQLITE_PATH
    ? path.resolve(process.env.SQLITE_PATH)
    : path.join(__dirname, '../../data/hilos.db');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.exec('PRAGMA foreign_keys = ON');

  await createSchema();
  await seedDefaults();

  console.log(`✅ SQLite conectado: ${dbPath}`);
  return db;
}

async function createSchema() {
  // 1. usuarios — con role (admin / empleado)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'empleado' CHECK(role IN ('admin','empleado')),
      activo INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. clientes
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      domicilio TEXT,
      ciudad TEXT,
      email TEXT,
      estado_cliente TEXT DEFAULT 'activo' CHECK(estado_cliente IN ('activo','inactivo')),
      descuento_global REAL DEFAULT 0,
      fecha_registro DATE DEFAULT CURRENT_DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. productos — catálogo de tipos de hilo (extensible)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      precio_base REAL NOT NULL DEFAULT 0,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. notas_remision (ventas)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notas_remision (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      cliente_id INTEGER NOT NULL,
      numero_nota INTEGER NOT NULL UNIQUE,
      fecha_venta DATE NOT NULL,
      estado_pago TEXT DEFAULT 'no_pagado' CHECK(estado_pago IN ('pagado','no_pagado','pendiente_de_completar')),
      monto_total REAL NOT NULL,
      descuento_aplicado REAL DEFAULT 0,
      monto_final REAL NOT NULL,
      metodo_pago TEXT,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
      FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT
    );
  `);

  // 5. detalles_nota
  await db.exec(`
    CREATE TABLE IF NOT EXISTS detalles_nota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nota_id INTEGER NOT NULL,
      producto_id INTEGER,
      tipo_hilo TEXT NOT NULL,
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(nota_id) REFERENCES notas_remision(id) ON DELETE CASCADE,
      FOREIGN KEY(producto_id) REFERENCES productos(id) ON DELETE SET NULL
    );
  `);

  // 6. pagos
  await db.exec(`
    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nota_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      monto_pagado REAL NOT NULL,
      metodo_pago TEXT NOT NULL,
      fecha_pago DATE NOT NULL,
      referencia TEXT,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(nota_id) REFERENCES notas_remision(id) ON DELETE CASCADE,
      FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
    );
  `);

  // 7. configuracion_descuentos (por cliente y/o por tipo de hilo y/o por volumen)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS configuracion_descuentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      tipo_hilo TEXT,
      cantidad_minima REAL NOT NULL DEFAULT 0,
      porcentaje_descuento REAL NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
  `);

  // 8. categorias_egreso — catálogo SQL que se referencia desde MongoDB
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categorias_egreso (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      descripcion TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Índices
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_nota_fecha ON notas_remision(fecha_venta);
    CREATE INDEX IF NOT EXISTS idx_nota_cliente ON notas_remision(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_nota_estado ON notas_remision(estado_pago);
    CREATE INDEX IF NOT EXISTS idx_detalle_nota ON detalles_nota(nota_id);
    CREATE INDEX IF NOT EXISTS idx_pago_nota ON pagos(nota_id);
    CREATE INDEX IF NOT EXISTS idx_cliente_estado ON clientes(estado_cliente);
  `);
}

async function seedDefaults() {
  // Admin por defecto
  const admin = await db.get('SELECT id FROM usuarios WHERE email = ?', ['admin@hilos.app']);
  if (!admin) {
    const hashed = await bcrypt.hash('admin123', 10);
    await db.run(
      'INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, ?)',
      ['Administrador', 'admin@hilos.app', hashed, 'admin']
    );
    console.log('🔐 Usuario admin creado → admin@hilos.app / admin123');
  }

  // Productos base (tipos de hilo)
  const prodCount = await db.get('SELECT COUNT(*) AS n FROM productos');
  if (prodCount.n === 0) {
    const productos = [
      ['HILO20',  'Número 20',   80],
      ['HILO30',  'Número 30',   85],
      ['HILO40',  'Número 40',   90],
      ['HILO60',  'Número 60',   95],
      ['HILO100', 'Número 100', 110],
      ['PABILO',  'Pabilo',      70],
      ['ESPECIAL','Especial',   130],
    ];
    for (const p of productos) {
      await db.run(
        'INSERT INTO productos (codigo, nombre, precio_base) VALUES (?, ?, ?)',
        p
      );
    }
  }

  // Categorías de egreso base
  const catCount = await db.get('SELECT COUNT(*) AS n FROM categorias_egreso');
  if (catCount.n === 0) {
    const cats = [
      ['Materia prima', 'Compra de hilo crudo, conos, etc.'],
      ['Logística',     'Transporte, fletes, envíos'],
      ['Sueldos',       'Nómina de empleados'],
      ['Renta',         'Renta de local o bodega'],
      ['Servicios',     'Luz, agua, internet'],
      ['Mantenimiento', 'Reparación de equipo'],
      ['Marketing',     'Publicidad, redes sociales'],
      ['Otros',         'Gastos varios'],
    ];
    for (const c of cats) {
      await db.run(
        'INSERT INTO categorias_egreso (nombre, descripcion) VALUES (?, ?)',
        c
      );
    }
  }
}

export function getSQLite() {
  if (!db) throw new Error('SQLite no inicializado');
  return db;
}

export async function closeSQLite() {
  if (db) {
    await db.close();
    db = null;
  }
}
