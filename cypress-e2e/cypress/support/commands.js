// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add('loginAs', (role = 'admin') => {
  cy.fixture('usuarios').then((usuarios) => {
    const { email, password } = usuarios[role];
    cy.request('POST', 'http://localhost:3001/api/auth/login', { email, password })
      .then((res) => {
        cy.window().then((win) => {
          win.localStorage.setItem('token', res.body.token);
          win.localStorage.setItem('user', JSON.stringify(res.body.user));
        });
      });
  });
});

Cypress.Commands.add('crearCliente', (nombre = 'Cliente Test E2E') => {
  cy.window().then((win) => {
    const token = win.localStorage.getItem('token');
    cy.request({
      method: 'POST',
      url: 'http://localhost:3001/api/clientes',
      headers: { Authorization: `Bearer ${token}` },
      body: { nombre, telefono: '5551234567', ciudad: 'León' },
      failOnStatusCode: false,
    });
  });
});

Cypress.Commands.add('limpiarDB', () => {
  cy.request('POST', 'http://localhost:3001/api/auth/login', {
    email: 'admin@hilos.app',
    password: 'admin123',
  }).then((res) => {
    cy.request({
      method: 'DELETE',
      url: 'http://localhost:3001/api/test/reset',
      headers: { Authorization: `Bearer ${res.body.token}` },
      failOnStatusCode: false,
    });
  });
});