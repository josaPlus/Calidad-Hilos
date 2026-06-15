// ─────────────────────────────────────────────
// HilosApp — Pruebas E2E (Sección 5)
// ─────────────────────────────────────────────
import LoginPage from '../pages/LoginPage.js';
import VentaPage from '../pages/VentaPage.js';
import UsuarioPage from '../pages/UsuarioPage.js';

const TIMEOUT = { timeout: 10000 };

// ─────────────────────────────────────────────
// 5.1.1 Registro de usuario nuevo
// ─────────────────────────────────────────────
describe('Registro de usuario nuevo', () => {
  beforeEach(() => {
    cy.loginAs('admin');
    UsuarioPage.visit();
    cy.get('[data-testid="btn-nuevo-usuario"]', TIMEOUT).should('be.visible');
  });

  it('admin puede registrar un nuevo usuario empleado', () => {
    UsuarioPage.abrirModalNuevo();
    UsuarioPage.llenarFormulario({
      nombre: 'Ruth Manriquez',
      email: `ruth${Date.now()}@hilos.app`,
      password: 'ruth1234',
      rol: 'empleado',
    });
    UsuarioPage.guardar();
    cy.contains('Usuario creado', TIMEOUT).should('be.visible');
  });

  it('no permite registrar usuario con email duplicado', () => {
    UsuarioPage.abrirModalNuevo();
    UsuarioPage.llenarFormulario({
      nombre: 'Admin Duplicado',
      email: 'admin@hilos.app',
      password: 'admin123',
      rol: 'empleado',
    });
    UsuarioPage.guardar();
    cy.contains('Email ya registrado', TIMEOUT).should('be.visible');
  });
});

// ─────────────────────────────────────────────
// 5.1.2 Login / Logout
// ─────────────────────────────────────────────
describe('Login y Logout', () => {
  it('login exitoso con credenciales válidas redirige al dashboard', () => {
    LoginPage.loginCon('admin@hilos.app', 'admin123');
    cy.url(TIMEOUT).should('include', '/dashboard');
  });

  it('login fallido con credenciales inválidas muestra error', () => {
    LoginPage.loginCon('admin@hilos.app', 'wrongpassword');
    cy.url().should('include', '/login');
    cy.contains(/credenciales|error/i, TIMEOUT).should('be.visible');
  });

  it('logout cierra sesión y redirige al login', () => {
    cy.loginAs('admin');
    cy.visit('/dashboard/clientes');
    LoginPage.clickLogout();
    cy.url(TIMEOUT).should('include', '/login');
  });
});

// ─────────────────────────────────────────────
// 5.1.3 Flujo principal — crear venta
// ─────────────────────────────────────────────
describe('Flujo principal — crear venta completa', () => {
  let nombreCliente;
  let ventaData;

  before(() => {
    cy.fixture('ventas').then((data) => {
      ventaData = data;
    });
  });

  beforeEach(() => {
    nombreCliente = `Cliente E2E ${Date.now()}`;
    cy.loginAs('admin');
    cy.crearCliente(nombreCliente);
    cy.visit('/ventas/nueva');
    cy.get('[data-testid="select-cliente"]', TIMEOUT).should('be.visible');
  });

  it('admin puede crear una venta con líneas de producto', () => {
    cy.fixture('ventas').then((data) => {
      cy.get('[data-testid="select-cliente"]').select(nombreCliente);
      cy.get('[data-testid="input-fecha"]').type(data.fecha);
      cy.get('[data-testid="btn-agregar-linea"]').click();
      cy.get('[data-testid="input-tipo-hilo"]', TIMEOUT).should('be.visible').type(data.linea1.tipoHilo);
      cy.get('[data-testid="input-cantidad"]').clear().type(data.linea1.cantidad);
      cy.get('[data-testid="input-precio"]').clear().type(data.linea1.precio);
      cy.get('[data-testid="btn-guardar-venta"]').click();
      cy.url(TIMEOUT).should('include', '/ventas');
    });
  });

  it('no permite guardar venta sin líneas de producto', () => {
    cy.get('[data-testid="select-cliente"]').select(nombreCliente);
    cy.get('[data-testid="btn-guardar-venta"]').click();
    cy.contains(/línea|line|agrega/i, TIMEOUT).should('be.visible');
  });
});

// ─────────────────────────────────────────────
// 5.1.4 Flujo de pago
// ─────────────────────────────────────────────
describe('Flujo de pago', () => {
  beforeEach(() => {
    cy.loginAs('admin');
    cy.visit('/pagos');
    cy.get('[data-testid="btn-registrar-pago"]', TIMEOUT).should('exist');
  });

  it('registra pago y muestra confirmación', () => {
    cy.get('[data-testid="btn-registrar-pago"]').first().click();
    cy.get('[data-testid="input-monto"]', TIMEOUT).should('be.visible').clear().type('100');
    cy.get('[data-testid="select-metodo"]').select('efectivo');
    cy.get('[data-testid="input-fecha-pago"]').type('2026-06-14');
    cy.get('[data-testid="btn-guardar-pago"]').click();
    cy.contains(/pago|registrado|éxito/i, TIMEOUT).should('be.visible');
  });
});

// ─────────────────────────────────────────────
// 5.1.5 Gestión de sesión
// ─────────────────────────────────────────────
describe('Gestión de sesión', () => {
  it('redirige al login si no hay sesión activa', () => {
    cy.clearLocalStorage();
    cy.visit('/dashboard/clientes');
    cy.url(TIMEOUT).should('include', '/login');
  });

  it('mantiene sesión al recargar la página', () => {
    cy.loginAs('admin');
    cy.visit('/dashboard/clientes');
    cy.reload();
    cy.url(TIMEOUT).should('include', '/dashboard');
  });
});

// ─────────────────────────────────────────────
// 5.1.6 Roles y permisos
// ─────────────────────────────────────────────
describe('Roles y permisos', () => {
  before(() => {
    cy.request('POST', 'http://localhost:3001/api/auth/login', {
      email: 'admin@hilos.app',
      password: 'admin123',
    }).then((res) => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:3001/api/users',
        headers: { Authorization: `Bearer ${res.body.token}` },
        failOnStatusCode: false,
        body: {
          nombre: 'Empleado Test',
          email: 'empleado@hilos.app',
          password: 'emp123',
          role: 'empleado',
        },
      });
    });
  });

  it('empleado no puede acceder al dashboard de clientes', () => {
    cy.loginAs('empleado');
    cy.visit('/dashboard/clientes');
    cy.url(TIMEOUT).should('not.include', '/dashboard/clientes');
  });

  it('admin sí puede acceder al dashboard de clientes', () => {
    cy.loginAs('admin');
    cy.visit('/dashboard/clientes');
    cy.url(TIMEOUT).should('include', '/dashboard/clientes');
  });

  it('empleado no ve botón de eliminar cliente', () => {
    cy.loginAs('empleado');
    cy.visit('/clientes');
    cy.wait(2000);
    cy.get('[data-testid="btn-eliminar-cliente"]').should('not.exist');
  });
});

// ─────────────────────────────────────────────
// 5.1.7 Flujos de error críticos
// ─────────────────────────────────────────────
describe('Flujos de error críticos', () => {
  it('muestra error cuando el servidor falla en login', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 500,
      body: { error: 'Error interno del servidor' }
    }).as('loginFail');
    cy.visit('/login');
    cy.get('[data-testid="input-email"]', TIMEOUT).type('admin@hilos.app');
    cy.get('[data-testid="input-password"]').type('admin123');
    cy.get('[data-testid="btn-login"]').click();
    cy.wait('@loginFail');
    cy.contains(/error/i, TIMEOUT).should('be.visible');
  });

  it('muestra error al crear venta con servidor caído', () => {
    const nombreCliente = `Error Test ${Date.now()}`;
    cy.loginAs('admin');
    cy.crearCliente(nombreCliente);
    cy.intercept('POST', '**/api/ventas', {
      statusCode: 500,
      body: { error: 'Error interno' }
    }).as('ventaFail');
    cy.visit('/ventas/nueva');
    cy.get('[data-testid="select-cliente"]', TIMEOUT).select(nombreCliente);
    cy.get('[data-testid="btn-agregar-linea"]').click();
    cy.get('[data-testid="input-tipo-hilo"]', TIMEOUT).type('Lana');
    cy.get('[data-testid="input-cantidad"]').clear().type('5');
    cy.get('[data-testid="input-precio"]').clear().type('30');
    cy.get('[data-testid="btn-guardar-venta"]').click();
    cy.wait('@ventaFail');
    cy.contains(/error/i, TIMEOUT).should('be.visible');
  });
});

// ─────────────────────────────────────────────
// 5.1.8 Formulario complejo — múltiples líneas
// ─────────────────────────────────────────────
describe('Formulario complejo — nueva venta con múltiples líneas', () => {
  let nombreCliente;

  beforeEach(() => {
    nombreCliente = `Cliente Multi ${Date.now()}`;
    cy.loginAs('admin');
    cy.crearCliente(nombreCliente);
    cy.visit('/ventas/nueva');
    cy.get('[data-testid="select-cliente"]', TIMEOUT).should('be.visible');
  });

  it('permite agregar múltiples líneas de producto en una venta', () => {
    cy.fixture('ventas').then((data) => {
      cy.get('[data-testid="select-cliente"]').select(nombreCliente);
      cy.get('[data-testid="input-fecha"]').type(data.fecha);

      cy.get('[data-testid="btn-agregar-linea"]').click();
      cy.get('[data-testid="input-tipo-hilo"]', TIMEOUT).first().type(data.linea1.tipoHilo);
      cy.get('[data-testid="input-cantidad"]').first().clear().type(data.linea1.cantidad);
      cy.get('[data-testid="input-precio"]').first().clear().type(data.linea1.precio);

      cy.get('[data-testid="btn-agregar-linea"]').click();
      cy.get('[data-testid="input-tipo-hilo"]', TIMEOUT).eq(1).type(data.linea2.tipoHilo);
      cy.get('[data-testid="input-cantidad"]').eq(1).clear().type(data.linea2.cantidad);
      cy.get('[data-testid="input-precio"]').eq(1).clear().type(data.linea2.precio);

      cy.get('[data-testid="btn-guardar-venta"]').click();
      cy.url(TIMEOUT).should('include', '/ventas');
    });
  });
});

// ─────────────────────────────────────────────
// 5.2.12 Verificación de accesibilidad básica
// ─────────────────────────────────────────────
describe('Accesibilidad básica en flujos críticos', () => {
  const registrarViolaciones = (violaciones) => {
    violaciones.forEach((v) => {
      cy.log(`❌ [${v.impact}] ${v.id}: ${v.description}`);
      v.nodes.forEach((n) => cy.log(`   Nodo: ${n.target}`));
    });
  };

  it('página de login — registra violaciones de accesibilidad', () => {
    cy.visit('/login');
    cy.injectAxe();
    cy.checkA11y(
      null,
      {
        runOnly: ['wcag2a', 'wcag2aa'],
        includedImpacts: ['critical', 'serious'],
      },
      registrarViolaciones,
      true // continúa aunque haya violaciones
    );
  });

  it('página de ventas — registra violaciones de accesibilidad', () => {
    cy.loginAs('admin');
    cy.visit('/ventas');
    cy.injectAxe();
    cy.checkA11y(
      null,
      {
        runOnly: ['wcag2a', 'wcag2aa'],
        includedImpacts: ['critical', 'serious'],
      },
      registrarViolaciones,
      true
    );
  });

  it('formulario nueva venta — registra violaciones de accesibilidad', () => {
    cy.loginAs('admin');
    cy.visit('/ventas/nueva');
    cy.injectAxe();
    cy.checkA11y(
      null,
      {
        runOnly: ['wcag2a', 'wcag2aa'],
        includedImpacts: ['critical', 'serious'],
      },
      registrarViolaciones,
      true
    );
  });
});