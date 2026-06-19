# 🧵 HilosApp · Gestor de Ventas de Hilos

Aplicación full-stack para la gestión de un negocio de venta de hilos: clientes, ventas, cobros, egresos, dashboards analíticos y exportación a Excel. Construida combinando **SQLite (transaccional)** y **MongoDB (datos flexibles + auditoría)** en un único backend Node/Express y un frontend React + Redux Toolkit.

> **Resultado de unir dos repositorios:** el gestor de ventas de hilos (React + Express + SQLite) y DronoxAdmin (roles, dashboards, egresos con MongoDB), reescrito como **una sola aplicación coherente**.

Proyecto desarrollado como entregable final de la materia de **Calidad de Software**.

---

## 👥 Equipo

| Integrante | Rol en el proyecto |
|---|---|
| **Josafat Aguirre** | Backend dev + QA — unit tests, integration tests, logging |
| **Ruth Manriquez** | Testing E2E (Cypress) y de rendimiento (JMeter) |
| **Camila Liedo** | Testing de seguridad (OWASP ZAP) y accesibilidad (WCAG 2.1 + compatibilidad de navegadores) |

---

## ✨ Funcionalidades

| Requerimiento | Estado | Dónde |
|---|---|---|
| Login / Logout | ✅ | `/login`, `Sidebar` |
| Roles (admin / empleado) | ✅ | JWT con role + `RequireAuth` |
| Empleado solo registra ventas y egresos | ✅ | `adminOEmpleado` middleware |
| Administrador con acceso total | ✅ | `soloAdmin` middleware |
| Alta / edición de clientes | ✅ | `/clientes`, `/clientes/nuevo`, `/clientes/:id` |
| Descuentos por cliente (global y por volumen) | ✅ | `configuracion_descuentos` |
| Dashboard **Clientes** (totales, nuevos, recurrentes, activos/inactivos, crecimiento mensual) | ✅ | `/dashboard/clientes` |
| Dashboard **Finanzas** (ingresos, egresos, flujo neto, prom. por cliente, top categorías, días negativos) | ✅ | `/dashboard/finanzas` |
| Dashboard **Hilos** (top vendidos) | ✅ | `/dashboard/hilos` |
| Auto-inactivación de clientes (30 días sin venta) | ✅ | `actualizarInactividad()` en SQLite |
| Exportación Excel | ✅ | `useExcelExport` hook |
| Datos en tiempo real | ✅ | Redux refetch tras cada mutación |
| Respuesta < 3s | ✅ | Índices SQL + agregaciones Mongo |
| Validación de entrada | ✅ | `validateBody()` server + validación cliente |
| Diseño responsive | ✅ | Tailwind + grid breakpoints |
| Espacio para logo de la empresa | ✅ | Sidebar y Login (slot personalizable) |
| Diseño amigable | ✅ | Paleta clara natural + iconos lucide |
| **12 tablas** (8 SQL + 4 NoSQL) | ✅ | Ver diagramas abajo |
| **SQL (SQLite) + NoSQL (MongoDB)** | ✅ | `backend/src/config/` |
| Colores `#6A8D73`, `#F4FDD9`, `#E4FFE1`, `#FFE8C2`, `#F0A868` | ✅ | `tailwind.config.js` |
| React + JavaScript | ✅ | Vite + React 18 |
| Hooks de calidad (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `memo`, custom hooks, Context API) | ✅ | Detalle abajo |
| Redux Toolkit (cuando aporta) | ✅ | 5 slices |
| Logging estructurado con correlationId | ✅ | Pino — ver sección de Logging |
| Suite de pruebas (unitarias, integración, E2E, rendimiento, seguridad) | ✅ | Ver sección de Testing |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                       │
│  Vite + React 18 + Redux Toolkit + Tailwind + Recharts      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Context API  │  │ Custom Hooks │  │ Redux (5 slices)   │ │
│  │ AuthContext  │  │ useFetch     │  │ clientes, ventas,  │ │
│  │ ToastContext │  │ useDebounce  │  │ pagos, egresos,    │ │
│  │              │  │ useExcelExp. │  │ productos          │ │
│  │              │  │ useLocalStor.│  │                    │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │  HTTP /api (axios + JWT)
┌─────────────────────────────▼───────────────────────────────┐
│                  BACKEND (Express + JWT)                    │
│   Middleware: auth, soloAdmin, adminOEmpleado, validator,   │
│               correlationId, pinoHttp (logging)             │
│                                                             │
│   ┌─────────────────────┐      ┌─────────────────────────┐  │
│   │   SQLite (8 tablas) │      │  MongoDB (4 colecc.)    │  │
│   │  • usuarios         │      │  • egresos              │  │
│   │  • clientes         │      │  • audit_log            │  │
│   │  • productos        │      │  • notificaciones       │  │
│   │  • notas_remision   │      │  • dashboard_snapshots  │  │
│   │  • detalles_nota    │      │                         │  │
│   │  • pagos            │      │  Datos flexibles,       │  │
│   │  • config_descuentos│      │  logs, métricas         │  │
│   │  • categorias_egreso│      │                         │  │
│   │                     │      │                         │  │
│   │  Datos              │      │                         │  │
│   │  transaccionales    │      │                         │  │
│   └─────────────────────┘      └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### ¿Por qué dos motores?

| | SQLite | MongoDB |
|---|---|---|
| Tipo | Relacional, transaccional, integridad referencial | Documento, flexible, sin esquema rígido |
| Aquí guarda | Ventas, clientes, productos, pagos (necesitan FKs y joins) | Egresos (campos abiertos, adjuntos, tags), auditoría, notificaciones, snapshots de KPIs |
| Tolerancia a fallos | Crítico (siempre activo) | Si Mongo no está disponible, la app sigue funcionando (egresos y logs quedan deshabilitados con aviso) |

---

## 🧠 Hooks y patrones React

| Hook / patrón | Uso en este proyecto |
|---|---|
| `useState` | Forms locales en cada página |
| `useEffect` | Carga inicial, restauración de sesión, cleanup en `useFetch` |
| `useMemo` | Cálculos derivados (filtros, totales, datos de gráficas, menú visible por rol) |
| `useCallback` | Handlers estables (`handleDelete`, `agregarLinea`, etc.) |
| `useRef` | IDs únicos en `ToastContext`, scroll al agregar línea en `VentaForm`, control de montaje en `useFetch` |
| `memo` | `Sidebar`, `Button`, `Card`, `Badge`, `KpiCard` |
| **Custom hooks** | `useAuth`, `useToast`, `useFetch`, `useDebounce`, `useLocalStorage`, `useExcelExport` |
| **Context API** | `AuthContext` (sesión y rol), `ToastContext` (notificaciones globales) |
| **Lifecycle** | Restauración de sesión en `useEffect` de `AuthProvider`; cancelación de updates en componentes desmontados (`useRef` + cleanup) |
| **Redux Toolkit** | 5 slices con `createAsyncThunk` para clientes, ventas, pagos, egresos y productos |

---

## 🎨 Paleta de colores

| Hex | Uso |
|---|---|
| `#6A8D73` | Color primario (sage) — botones, énfasis |
| `#F4FDD9` | Fondo principal (mist) |
| `#E4FFE1` | Tarjetas hover, fondos secundarios (leaf) |
| `#FFE8C2` | Highlights y warnings suaves (cream) |
| `#F0A868` | Color de acción (amber) — CTA, gráficas |

Tipografía: **Fraunces** (display) + **Plus Jakarta Sans** (cuerpo) — vía Google Fonts.

---

## 🚀 Cómo correr la aplicación

### Requisitos

- Node.js 18+
- (Opcional) MongoDB local o cuenta de MongoDB Atlas. La app funciona sin Mongo pero los egresos/logs se deshabilitan.

### 1. Instalación

```bash
git clone <repo>
cd hilos-app
npm run install:all
# (instala dependencias en raíz, backend, frontend y cypress)
```

### 2. Configurar backend

```bash
cd backend
cp .env.example .env
# Edita .env si quieres cambiar el puerto, JWT_SECRET o MONGO_URI
```

`.env` ejemplo:
```
PORT=3001
JWT_SECRET=mi_clave_secreta
SQLITE_PATH=./data/hilos.db
MONGO_URI=mongodb://127.0.0.1:27017/hilos_app
CORS_ORIGIN=http://localhost:5173
```

### 3. Levantar en desarrollo (dos terminales)

```bash
# Terminal 1 — backend (puerto 3001)
cd backend
npm run dev

# Terminal 2 — frontend (puerto 5173)
cd frontend
npm run dev
```

Abre <http://localhost:5173>

### 4. Cuenta inicial

Al iniciar el backend se crea automáticamente:

- **Email**: `admin@hilos.app`
- **Contraseña**: `admin123`
- **Rol**: admin

> Cámbiala en cuanto entres, desde **Usuarios → Editar**.

### 5. Build para producción

```bash
cd frontend
npm run build
# Sirve el contenido de frontend/dist/ con cualquier servidor estático
```

---

## 👥 Roles y permisos

| Acción | Admin | Empleado |
|---|---|---|
| Iniciar sesión / Cerrar sesión | ✅ | ✅ |
| Ver y crear ventas | ✅ | ✅ |
| Registrar egresos | ✅ | ✅ |
| Ver dashboards | ✅ | ❌ |
| CRUD de clientes y descuentos | ✅ | ❌ |
| Registrar pagos | ✅ | ✅ |
| Eliminar ventas / egresos | ✅ | ❌ |
| Administrar usuarios | ✅ | ❌ |
| Editar catálogo de productos | ✅ | ❌ |

---

## 📊 Diagramas de base de datos

### SQLite (8 tablas) — Mermaid ER

```mermaid
erDiagram
    USUARIOS ||--o{ NOTAS_REMISION       : "registra"
    USUARIOS ||--o{ PAGOS                : "registra"
    CLIENTES ||--o{ NOTAS_REMISION       : "compra"
    CLIENTES ||--o{ CONFIG_DESCUENTOS    : "tiene"
    NOTAS_REMISION ||--o{ DETALLES_NOTA  : "contiene"
    NOTAS_REMISION ||--o{ PAGOS          : "recibe"
    PRODUCTOS ||--o{ DETALLES_NOTA       : "se vende en"

    USUARIOS {
        int    id PK
        string nombre
        string email UK
        string password
        string role "admin|empleado"
        int    activo
        date   created_at
    }
    CLIENTES {
        int    id PK
        string nombre
        string telefono
        string domicilio
        string ciudad
        string email
        string estado_cliente "activo|inactivo (auto 30d)"
        float  descuento_global
        date   fecha_registro
    }
    PRODUCTOS {
        int    id PK
        string codigo UK
        string nombre
        float  precio_base
        int    activo
    }
    NOTAS_REMISION {
        int    id PK
        int    usuario_id FK
        int    cliente_id FK
        int    numero_nota UK
        date   fecha_venta
        string estado_pago "pagado|no_pagado|pendiente"
        float  monto_total
        float  descuento_aplicado
        float  monto_final
        string metodo_pago
        text   notas
    }
    DETALLES_NOTA {
        int    id PK
        int    nota_id FK
        int    producto_id FK
        string tipo_hilo
        float  cantidad
        float  precio_unitario
        float  subtotal
    }
    PAGOS {
        int    id PK
        int    nota_id FK
        int    usuario_id FK
        float  monto_pagado
        string metodo_pago
        date   fecha_pago
        string referencia
        text   notas
    }
    CONFIG_DESCUENTOS {
        int    id PK
        int    cliente_id FK
        string tipo_hilo
        float  cantidad_minima
        float  porcentaje_descuento
        int    activo
    }
    CATEGORIAS_EGRESO {
        int    id PK
        string nombre UK
        text   descripcion
        int    activo
    }
```

### MongoDB (4 colecciones)

```mermaid
classDiagram
    class Egreso {
        +ObjectId _id
        +Date fecha
        +String categoria  "valida contra SQL"
        +String concepto
        +Number monto
        +String metodoPago
        +String referencia
        +String observaciones
        +Number usuarioId  "ref. usuarios SQL"
        +String usuarioNombre
        +Array adjuntos
        +Array tags
        +Date createdAt
        +Date updatedAt
    }

    class AuditLog {
        +ObjectId _id
        +String accion       "crear|actualizar|eliminar|login"
        +String entidad      "venta|cliente|egreso..."
        +String entidadId
        +Number usuarioId
        +String usuarioNombre
        +String rol
        +Mixed  payload      "diff/contexto"
        +String ip
        +Date fecha
    }

    class Notificacion {
        +ObjectId _id
        +Number usuarioId
        +String tipo  "info|success|warning|error"
        +String titulo
        +String mensaje
        +Boolean leida
        +String link
        +Mixed metadata
        +Date fecha
    }

    class DashboardSnapshot {
        +ObjectId _id
        +String tipo  "clientes|finanzas|hilos"
        +String rango "hoy|semana|mes|trimestre|año|custom"
        +Date desde
        +Date hasta
        +Mixed data   "KPIs serializados"
        +Date generadoEn "TTL 30 días"
        +Number usuarioId
    }
```

### Resumen de las 12 tablas

| # | Tabla / Colección | Motor | Propósito |
|---|---|---|---|
| 1 | `usuarios` | SQLite | Cuentas con rol admin/empleado |
| 2 | `clientes` | SQLite | Cartera de clientes |
| 3 | `productos` | SQLite | Catálogo de tipos de hilo |
| 4 | `notas_remision` | SQLite | Ventas (cabecera) |
| 5 | `detalles_nota` | SQLite | Líneas de cada venta |
| 6 | `pagos` | SQLite | Cobros parciales o totales |
| 7 | `configuracion_descuentos` | SQLite | Descuentos por cliente / volumen / producto |
| 8 | `categorias_egreso` | SQLite | Catálogo de categorías (referenciado desde Mongo) |
| 9 | `egresos` | MongoDB | Gastos con campos flexibles y adjuntos |
| 10 | `audit_log` | MongoDB | Bitácora completa de acciones |
| 11 | `notificaciones` | MongoDB | Avisos por usuario |
| 12 | `dashboard_snapshots` | MongoDB | Snapshots de KPIs con TTL de 30 días |

---

## 📡 API principal

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me              [auth]
POST   /api/auth/logout          [auth]

GET    /api/users                [admin]
POST   /api/users                [admin]
PUT    /api/users/:id            [admin]
DELETE /api/users/:id            [admin]

GET    /api/clientes             [auth]
POST   /api/clientes             [admin]
PUT    /api/clientes/:id         [admin]
DELETE /api/clientes/:id         [admin]
POST   /api/clientes/:id/descuentos
DELETE /api/clientes/:id/descuentos/:dId

GET    /api/productos            [auth]
POST   /api/productos            [admin]
PUT    /api/productos/:id        [admin]

GET    /api/ventas               [auth]
GET    /api/ventas/proximo-numero
POST   /api/ventas               [admin|empleado]
PUT    /api/ventas/:id           [admin|empleado]
DELETE /api/ventas/:id           [admin]

GET    /api/pagos                [auth]
GET    /api/pagos/saldo/pendiente
POST   /api/pagos                [admin|empleado]

GET    /api/egresos              [auth]   ← MongoDB
POST   /api/egresos              [admin|empleado]
DELETE /api/egresos/:id          [admin]
GET    /api/categorias-egreso    [auth]

GET    /api/dashboard/clientes   [admin]
GET    /api/dashboard/finanzas   [admin]
GET    /api/dashboard/hilos      [admin]

GET    /api/metrics              (público) ← RED metrics por endpoint
GET    /api/status                (público)
```

---

## 📁 Estructura del proyecto

```
hilos-app/
├── backend/
│   ├── src/
│   │   ├── app.js                  # App de Express (sin listen) — usada por Supertest
│   │   ├── server.js               # Entry point — importa app.js y levanta el listen
│   │   ├── config/
│   │   │   ├── sqlite.js           # SQLite + schema + seed
│   │   │   └── mongo.js            # MongoDB (tolerante a fallos)
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT + role guards
│   │   │   └── validator.js        # validateBody()
│   │   ├── models/mongo/
│   │   │   ├── Egreso.js
│   │   │   ├── AuditLog.js
│   │   │   ├── Notificacion.js
│   │   │   └── DashboardSnapshot.js
│   │   ├── controllers/            # auth, users, clientes, ventas, pagos, egresos, productos, dashboard
│   │   ├── routes/index.js         # Todas las rutas
│   │   └── utils/
│   │       ├── audit.js            # Log a MongoDB
│   │       ├── logger.js           # Pino — logging estructurado
│   │       └── metrics.js          # RED metrics por endpoint (rate, errors, duration)
│   ├── tests/
│   │   ├── unit/                   # Vitest — 11 archivos, 218 tests
│   │   │   ├── validator.test.js
│   │   │   ├── calculos.test.js
│   │   │   ├── auth.controller.test.js
│   │   │   ├── users.controller.test.js
│   │   │   ├── productos.controller.test.js
│   │   │   ├── pagos.controller.test.js
│   │   │   ├── clientes.controller.test.js
│   │   │   ├── ventas.controller.test.js
│   │   │   └── egresos.controller.test.js
│   │   └── integration/            # Supertest contra SQLite real
│   │       ├── auth.test.js
│   │       ├── clientes.test.js
│   │       ├── ventas.test.js
│   │       └── pagos.test.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                 # Routes + role guards
│   │   ├── context/                # AuthContext + ToastContext (Context API)
│   │   ├── hooks/                  # useFetch, useDebounce, useLocalStorage, useExcelExport
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   └── slices/             # 5 slices con createAsyncThunk
│   │   ├── components/             # UI primitives + Sidebar + Layout
│   │   ├── pages/                  # 11 páginas
│   │   ├── services/api.js         # axios + interceptores
│   │   ├── styles/index.css        # Tailwind + tokens
│   │   └── utils/constants.js
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── cypress/
│   ├── e2e/                        # 8 flujos requeridos
│   ├── fixtures/
│   ├── support/
│   │   └── commands.js             # Custom commands (cy.login, etc.)
│   ├── pages/                      # Page Object Model
│   └── package.json
├── docs/
│   ├── DATABASE_SQL.md
│   └── DATABASE_NOSQL.md
└── README.md
```

> **Nota:** los archivos de JMeter (`.jmx`) y el reporte de OWASP ZAP no están incluidos en este listado por simplicidad, pero forman parte de los entregables del proyecto (ver sección de Testing).

---

## 🧪 Testing

El proyecto cuenta con una suite de pruebas en 5 niveles, distribuida entre los tres integrantes del equipo.

### Unit tests — Vitest

- **11 archivos · 218 tests** pasando.
- Cobertura: validadores, lógica de negocio pura (cálculos de descuentos, subtotales, estado de pago, porcentajes) y controladores (`auth`, `users`, `productos`, `pagos`, `clientes`, `ventas`, `egresos`).
- Uso de `vi.mock` para aislar MongoDB y dependencias externas en cada test.
- Patrón Arrange-Act-Assert, tests independientes entre sí.

```bash
cd backend
npm run test:unit
```

### Integration tests — Supertest

- **4 archivos**: `auth`, `clientes`, `ventas`, `pagos`.
- Corren contra una base SQLite de pruebas real (no mockeada), con limpieza vía `unlinkSync` al finalizar cada suite.
- Requirió separar `app.js` (la app de Express) de `server.js` (el `listen()`), para que Supertest pueda importar la app sin levantar un puerto real.

```bash
cd backend
npm run test:integration
```

### E2E — Cypress

- Proyecto completo con **Page Object Model**, fixtures, custom commands y `cypress-axe` para accesibilidad básica.
- Cubre los **8 flujos requeridos** por el examen (login, CRUD de clientes, registro de venta, registro de pago, registro de egreso, roles, dashboards, exportación Excel).
- El usuario `empleado` (no precargado en el seed) se crea vía API en un hook `before()`.

```bash
cd cypress
npx cypress open    # modo interactivo
npx cypress run     # modo headless
```

### Rendimiento — JMeter

- Test plan con **4 thread groups**: Load, Stress, Spike y Soak.
- Responsable: Ruth Manriquez.

### Seguridad — OWASP ZAP

- Escaneo contra `http://localhost:5173`, cubriendo 4 puntos del OWASP Top 10.
- Responsable: Camila Liedo.

### Resumen de cobertura automatizada

| Tipo | Herramienta | Cantidad | Responsable |
|---|---|---|---|
| Unitarias | Vitest | 218 tests / 11 archivos | Josafat |
| Integración | Supertest | 4 suites | Josafat |
| E2E | Cypress | 8 flujos | Josafat / Ruth |
| Rendimiento | JMeter | 4 thread groups | Ruth |
| Seguridad | OWASP ZAP | 4 puntos OWASP Top 10 | Camila |
| Accesibilidad | WCAG 2.1 + compatibilidad navegadores | — | Camila |

---

## 📋 Logging

Logging estructurado en formato JSON con **Pino** + **pino-http**, integrado como middleware en `app.js`.

- **`backend/src/utils/logger.js`**: instancia central de Pino. Centralizar el logging detrás de este único archivo permite cambiar la implementación (por ejemplo, migrar a un servicio externo) sin tocar los controladores.
- **`correlationId`**: generado por request con `crypto.randomUUID()`, permite rastrear una petición a través de todos sus logs.
- **Redacción de campos sensibles**: passwords, tokens y headers de autorización nunca se escriben en los logs.
- **Cobertura**: integrado en 8 controladores (`auth`, `ventas`, `clientes`, `egresos`, `pagos`, `dashboard`, `productos`, `users`), cada uno registrando intentos, éxitos, warnings y errores junto con `correlationId`, `userId` y un campo `action` para trazabilidad.
- **Métricas RED** (`backend/src/utils/metrics.js`): rate, errors y duration por endpoint usando únicamente `process.hrtime.bigint` (sin dependencias nuevas), expuestas en `GET /api/metrics`.

---

## 🧪 Validación y rendimiento

- **Validación de entrada**: en el cliente (HTML5 + estado), en el servidor (`validateBody`) y en la BD (CHECK constraints).
- **Índices SQL** en `fecha_venta`, `cliente_id`, `estado_pago`, `nota_id`, `estado_cliente` → consultas < 50 ms en hasta ~100k filas.
- **Agregaciones Mongo** indexadas en `fecha` y `categoria` → dashboard financiero < 200 ms.
- **TTL en `dashboard_snapshots`** → limpieza automática a 30 días.
- **Responses < 3 s**: cumple ampliamente; en local típicamente < 300 ms.

---

## 🔐 Seguridad

- Contraseñas hasheadas con bcrypt (10 rondas).
- JWT con expiración configurable (`JWT_EXPIRATION`).
- Middleware `soloAdmin` y `adminOEmpleado` aplicado por ruta.
- CORS configurable vía `.env`.
- Cambia `JWT_SECRET` en producción.
- Validado adicionalmente con OWASP ZAP (ver sección de Testing).

---

## 📝 Notas de diseño

- Si Mongo no está disponible, el endpoint de egresos responde 503 sin tirar la app, y `audit()` es fire-and-forget.
- El estado `inactivo` de un cliente se recalcula automáticamente al consultar la lista (sin cron).
- Las ventas pueden tener varias líneas (`detalles_nota`); el descuento puede venir del cliente (global), de la nota (manual) o del cruce volumen × tipo de hilo.
- La paleta clara está pensada para evitar fatiga visual en uso prolongado.

---

## 🌐 Despliegue

| Componente | Plataforma | URL |
|---|---|---|
| Frontend | Netlify | `https://calidad-hilos.netlify.app` |
| Backend | DigitalOcean App Platform | — |
| MongoDB | MongoDB Atlas | — |

> La base SQLite se mantiene versionada en el repositorio para conservar los datos de seed entre despliegues.

---

## 📞 Stack

- **React 18** + Vite + JavaScript
- **Redux Toolkit** (5 slices) + Context API
- **Tailwind CSS** + Recharts + Lucide Icons
- **Express 4** + JWT (jsonwebtoken)
- **SQLite** (sqlite3 + sqlite wrapper)
- **MongoDB** (mongoose 8)
- **bcryptjs** para hashing
- **xlsx** para exportación
- **Pino** + pino-http para logging estructurado
- **Vitest** (unit) · **Supertest** (integration) · **Cypress** + cypress-axe (E2E) · **JMeter** (rendimiento) · **OWASP ZAP** (seguridad)

---

**HilosApp © 2026 · Privado · MIT**