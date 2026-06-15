class VentaPage {
  visit() {
    cy.visit('/ventas/nueva');
  }

  seleccionarCliente(nombre) {
    cy.get('[data-testid="select-cliente"]', { timeout: 10000 }).select(nombre);
  }

  escribirFecha(fecha) {
    cy.get('[data-testid="input-fecha"]').type(fecha);
  }

  agregarLinea(tipoHilo, cantidad, precio, index = 0) {
    cy.get('[data-testid="btn-agregar-linea"]').click();
    cy.get('[data-testid="input-tipo-hilo"]', { timeout: 10000 }).eq(index).type(tipoHilo);
    cy.get('[data-testid="input-cantidad"]').eq(index).clear().type(cantidad);
    cy.get('[data-testid="input-precio"]').eq(index).clear().type(precio);
  }

  guardar() {
    cy.get('[data-testid="btn-guardar-venta"]').click();
  }
}

export default new VentaPage();