class LoginPage {
  visit() {
    cy.visit('/login');
  }

  escribirEmail(email) {
    cy.get('[data-testid="input-email"]', { timeout: 10000 }).type(email);
  }

  escribirPassword(password) {
    cy.get('[data-testid="input-password"]').type(password);
  }

  clickEntrar() {
    cy.get('[data-testid="btn-login"]').click();
  }

  clickLogout() {
    cy.get('[data-testid="btn-logout"]', { timeout: 10000 }).click();
  }

  loginCon(email, password) {
    this.visit();
    this.escribirEmail(email);
    this.escribirPassword(password);
    this.clickEntrar();
  }
}

export default new LoginPage();