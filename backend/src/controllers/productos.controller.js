import { getSQLite } from '../config/sqlite.js';
import { audit } from '../utils/audit.js';

export async function listProductos(req, res) {
  try {
    const db = getSQLite();
    const productos = await db.all(
      'SELECT * FROM productos WHERE activo = 1 ORDER BY nombre ASC'
    );
    res.json({ productos });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
}

export async function createProducto(req, res) {
  try {
    const { codigo, nombre, precio_base } = req.body;
    const db = getSQLite();
    const result = await db.run(
      'INSERT INTO productos (codigo, nombre, precio_base) VALUES (?, ?, ?)',
      [codigo, nombre, precio_base || 0]
    );
    audit({ accion: 'crear', entidad: 'producto', entidadId: result.lastID, req, payload: req.body });
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear producto (¿código duplicado?)' });
  }
}

export async function updateProducto(req, res) {
  try {
    const { id } = req.params;
    const { nombre, precio_base, activo } = req.body;
    const db = getSQLite();
    await db.run(
      `UPDATE productos SET
         nombre = COALESCE(?, nombre),
         precio_base = COALESCE(?, precio_base),
         activo = COALESCE(?, activo)
       WHERE id = ?`,
      [nombre, precio_base, activo, id]
    );
    audit({ accion: 'actualizar', entidad: 'producto', entidadId: id, req, payload: req.body });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
}
