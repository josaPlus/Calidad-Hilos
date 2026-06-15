class UsuarioPage {
  visit() {
    cy.visit('/usuarios');
  }

  abrirModalNuevo() {
    cy.get('[data-testid="btn-nuevo-usuario"]', { timeout: 10000 }).click();
  }

  llenarFormulario({ nombre, email, password, rol = 'empleado' }) {
    cy.get('[data-testid="input-nombre"]', { timeout: 10000 }).should('be.visible').type(nombre);
    cy.get('[data-testid="input-email"]').type(email);
    cy.get('[data-testid="input-password"]').type(password);
    cy.get('[data-testid="select-rol"]').select(rol);
  }

  guardar() {
    cy.get('[data-testid="btn-guardar-usuario"]').click();
  }
}

export default new UsuarioPage();