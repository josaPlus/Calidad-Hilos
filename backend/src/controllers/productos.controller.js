import { getSQLite } from '../config/sqlite.js';
import { audit } from '../utils/audit.js';
import logger from '../utils/logger.js';

export async function listProductos(req, res) {
  const correlationId = req.correlationId;
  try {
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, action: 'list_productos' },
      'Listado de productos consultado'
    );

    const productos = await db.all(
      'SELECT * FROM productos WHERE activo = 1 ORDER BY nombre ASC'
    );

    logger.info(
      { correlationId, userId: req.user.id, total: productos.length, action: 'list_productos_success' },
      `Se encontraron ${productos.length} productos`
    );

    res.json({ productos });
  } catch (err) {
    logger.error(
      { correlationId, err: err.message, action: 'list_productos_error' },
      'Error al obtener productos'
    );
    res.status(500).json({ error: 'Error al obtener productos' });
  }
}

export async function createProducto(req, res) {
  const correlationId = req.correlationId;
  try {
    const { codigo, nombre, precio_base } = req.body;
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, codigo, nombre, precio_base, action: 'create_producto_attempt' },
      'Intento de crear producto'
    );

    if (!codigo || !nombre) {
      logger.warn(
        { correlationId, userId: req.user.id, action: 'create_producto_invalid' },
        'Datos inválidos para crear producto'
      );
      return res.status(400).json({ error: 'codigo y nombre son obligatorios' });
    }

    const existe = await db.get('SELECT id FROM productos WHERE codigo = ?', [codigo]);
    if (existe) {
      logger.warn(
        { correlationId, userId: req.user.id, codigo, action: 'create_producto_duplicate' },
        'Código de producto duplicado'
      );
      return res.status(400).json({ error: 'El código ya existe' });
    }

    const result = await db.run(
      'INSERT INTO productos (codigo, nombre, precio_base) VALUES (?, ?, ?)',
      [codigo, nombre, precio_base || 0]
    );

    logger.info(
      {
        correlationId,
        userId: req.user.id,
        productoId: result.lastID,
        codigo,
        nombre,
        precio_base: precio_base || 0,
        action: 'create_producto_success',
      },
      `Producto creado: ${nombre} (${codigo})`
    );

    audit({ accion: 'crear', entidad: 'producto', entidadId: result.lastID, req, payload: req.body });
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    logger.error(
      { correlationId, err: err.message, action: 'create_producto_error' },
      'Error al crear producto'
    );
    res.status(500).json({ error: 'Error al crear producto (¿código duplicado?)' });
  }
}

export async function updateProducto(req, res) {
  const correlationId = req.correlationId;
  try {
    const { id } = req.params;
    const { nombre, precio_base, activo } = req.body;
    const db = getSQLite();

    logger.info(
      { correlationId, userId: req.user.id, productoId: id, nombre, precio_base, activo, action: 'update_producto_attempt' },
      'Intento de actualizar producto'
    );

    const producto = await db.get('SELECT id FROM productos WHERE id = ?', [id]);
    if (!producto) {
      logger.warn(
        { correlationId, userId: req.user.id, productoId: id, action: 'update_producto_not_found' },
        'Producto no encontrado para actualizar'
      );
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await db.run(
      `UPDATE productos SET
         nombre = COALESCE(?, nombre),
         precio_base = COALESCE(?, precio_base),
         activo = COALESCE(?, activo)
       WHERE id = ?`,
      [nombre, precio_base, activo, id]
    );

    logger.info(
      { correlationId, userId: req.user.id, productoId: id, action: 'update_producto_success' },
      'Producto actualizado correctamente'
    );

    audit({ accion: 'actualizar', entidad: 'producto', entidadId: id, req, payload: req.body });
    res.json({ ok: true });
  } catch (err) {
    logger.error(
      { correlationId, err: err.message, action: 'update_producto_error' },
      'Error al actualizar producto'
    );
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
}