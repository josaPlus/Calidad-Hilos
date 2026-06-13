import { describe, it, expect } from 'vitest';
import { validators } from '../middleware/validator.js';

describe('validators - email', () => {
  it('acepta email valido', () => {
    expect(validators.email('admin@hilos.app')).toBe(true);
  });

  it('rechaza email sin dominio', () => {
    expect(validators.email('mariana@m')).toBe(false);
  });

  it('rechaza email sin @', () => {
    expect(validators.email('adminhilos.app')).toBe(false); 
  });

  it('rechaza email vacio', () => {
    expect(validators.email('')).toBe(false);
  });
});

describe('validators - password', () => {
  it('acepta password de 6 caracteres', () => {
    expect(validators.password('admin1')).toBe(true);
  });

  it('acepta password largo', () => {
    expect(validators.password('contrasena123segura')).toBe(true);
  });

  it('rechaza password menor a 6 caracteres', () => {
    expect(validators.password('abc')).toBe(false);
  });

  it('rechaza password vacio', () => {
    expect(validators.password('')).toBe(false);
  });
});

describe('validators - precio', () => {
  it('acepta precio positivo', () => {
    expect(validators.precio(100)).toBe(true);
  });

  it('acepta precio cero', () => {
    expect(validators.precio(0)).toBe(true);
  });

  it('acepta precio decimal', () => {
    expect(validators.precio(99.99)).toBe(true);
  });

  it('rechaza precio negativo', () => {
    expect(validators.precio(-1)).toBe(false);
  });

  it('rechaza texto como precio', () => {
    expect(validators.precio('abc')).toBe(false);
  });
});

describe('validators - cantidad', () => {
  it('acepta cantidad positiva', () => {
    expect(validators.cantidad(5)).toBe(true);
  });

  it('acepta cantidad decimal', () => {
    expect(validators.cantidad(0.5)).toBe(true);
  });

  it('rechaza cantidad cero', () => {
    expect(validators.cantidad(0)).toBe(false);
  });

  it('rechaza cantidad negativa', () => {
    expect(validators.cantidad(-1)).toBe(false);
  });
});

describe('validators - estadoPago', () => {
  it('acepta pagado', () => {
    expect(validators.estadoPago('pagado')).toBe(true);
  });

  it('acepta no_pagado', () => {
    expect(validators.estadoPago('no_pagado')).toBe(true);
  });

  it('acepta pendiente_de_completar', () => {
    expect(validators.estadoPago('pendiente_de_completar')).toBe(true);
  });

  it('rechaza estado invalido', () => {
    expect(validators.estadoPago('cancelado')).toBe(false);
  });

  it('rechaza estado vacio', () => {
    expect(validators.estadoPago('')).toBe(false);
  });
});

describe('validators - metodoPago', () => {
  it('acepta efectivo', () => {
    expect(validators.metodoPago('efectivo')).toBe(true);
  });

  it('acepta transferencia', () => {
    expect(validators.metodoPago('transferencia')).toBe(true);
  });

  it('acepta tarjeta', () => {
    expect(validators.metodoPago('tarjeta')).toBe(true);
  });

  it('rechaza metodo invalido', () => {
    expect(validators.metodoPago('bitcoin')).toBe(false);
  });
});

describe('validators - descuento', () => {
  it('acepta descuento de 0', () => {
    expect(validators.descuento(0)).toBe(true);
  });

  it('acepta descuento de 50', () => {
    expect(validators.descuento(50)).toBe(true);
  });

  it('acepta descuento de 100', () => {
    expect(validators.descuento(100)).toBe(true);
  });

  it('rechaza descuento mayor a 100', () => {
    expect(validators.descuento(101)).toBe(false);
  });

  it('rechaza descuento negativo', () => {
    expect(validators.descuento(-1)).toBe(false);
  });
});

describe('validators - role', () => {
  it('acepta admin', () => {
    expect(validators.role('admin')).toBe(true);
  });

  it('acepta empleado', () => {
    expect(validators.role('empleado')).toBe(true);
  });

  it('rechaza role invalido', () => {
    expect(validators.role('superadmin')).toBe(false);
  });
});