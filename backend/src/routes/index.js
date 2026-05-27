import express from 'express';
import { authMiddleware, soloAdmin, adminOEmpleado } from '../middleware/auth.js';
import { validateBody } from '../middleware/validator.js';

import * as auth      from '../controllers/auth.controller.js';
import * as users     from '../controllers/users.controller.js';
import * as clientes  from '../controllers/clientes.controller.js';
import * as productos from '../controllers/productos.controller.js';
import * as ventas    from '../controllers/ventas.controller.js';
import * as pagos     from '../controllers/pagos.controller.js';
import * as egresos   from '../controllers/egresos.controller.js';
import * as dashboard from '../controllers/dashboard.controller.js';

const r = express.Router();

// ===== AUTH (público) =====
r.post('/auth/register',
  validateBody({ nombre: { required: true, type: 'nombre' }, email: { required: true, type: 'email' }, password: { required: true, type: 'password' } }),
  auth.register
);
r.post('/auth/login',
  validateBody({ email: { required: true, type: 'email' }, password: { required: true, type: 'password' } }),
  auth.login
);
r.get ('/auth/me',     authMiddleware, auth.me);
r.post('/auth/logout', authMiddleware, auth.logout);

// ===== USUARIOS (solo admin) =====
r.get   ('/users',     authMiddleware, soloAdmin, users.listUsers);
r.post  ('/users',     authMiddleware, soloAdmin,
  validateBody({ nombre: { required: true, type: 'nombre' }, email: { required: true, type: 'email' }, password: { required: true, type: 'password' }, role: { type: 'role' } }),
  users.createUser
);
r.put   ('/users/:id', authMiddleware, soloAdmin, users.updateUser);
r.delete('/users/:id', authMiddleware, soloAdmin, users.deleteUser);

// ===== CLIENTES (solo admin para CRUD; empleado solo lee) =====
r.get   ('/clientes',                 authMiddleware, clientes.listClientes);
r.get   ('/clientes/:id',             authMiddleware, clientes.getCliente);
r.post  ('/clientes',                 authMiddleware, soloAdmin,
  validateBody({ nombre: { required: true, type: 'nombre' }, telefono: { type: 'telefono' } }),
  clientes.createCliente
);
r.put   ('/clientes/:id',             authMiddleware, soloAdmin, clientes.updateCliente);
r.delete('/clientes/:id',             authMiddleware, soloAdmin, clientes.deleteCliente);
r.post  ('/clientes/:id/descuentos',  authMiddleware, soloAdmin, clientes.addDescuento);
r.delete('/clientes/:id/descuentos/:descuentoId', authMiddleware, soloAdmin, clientes.deleteDescuento);

// ===== PRODUCTOS =====
r.get   ('/productos',     authMiddleware, productos.listProductos);
r.post  ('/productos',     authMiddleware, soloAdmin, productos.createProducto);
r.put   ('/productos/:id', authMiddleware, soloAdmin, productos.updateProducto);

// ===== VENTAS — empleados también pueden crear =====
r.get   ('/ventas/proximo-numero', authMiddleware, ventas.proximoNumero);
r.get   ('/ventas',     authMiddleware, ventas.listVentas);
r.get   ('/ventas/:id', authMiddleware, ventas.getVenta);
r.post  ('/ventas',     authMiddleware, adminOEmpleado, ventas.createVenta);
r.put   ('/ventas/:id', authMiddleware, adminOEmpleado, ventas.updateVenta);
r.delete('/ventas/:id', authMiddleware, soloAdmin, ventas.deleteVenta);

// ===== PAGOS =====
r.get ('/pagos',                 authMiddleware, pagos.listPagos);
r.get ('/pagos/saldo/pendiente', authMiddleware, pagos.saldosPendientes);
r.post('/pagos',                 authMiddleware, adminOEmpleado, pagos.registrarPago);

// ===== EGRESOS (MongoDB) — empleados también pueden crear =====
r.get   ('/egresos',     authMiddleware, egresos.listEgresos);
r.post  ('/egresos',     authMiddleware, adminOEmpleado, egresos.createEgreso);
r.delete('/egresos/:id', authMiddleware, soloAdmin, egresos.deleteEgreso);
r.get   ('/categorias-egreso', authMiddleware, egresos.listCategorias);

// ===== DASHBOARDS (solo admin) =====
r.get('/dashboard/clientes', authMiddleware, soloAdmin, dashboard.dashboardClientes);
r.get('/dashboard/finanzas', authMiddleware, soloAdmin, dashboard.dashboardFinanzas);
r.get('/dashboard/hilos',    authMiddleware, soloAdmin, dashboard.dashboardHilos);

export default r;
