export const validators = {
  email:    (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  password: (v) => typeof v === 'string' && v.length >= 6,
  nombre:   (v) => typeof v === 'string' && v.trim().length >= 2 && v.length <= 100,
  telefono: (v) => v == null || v === '' || /^[0-9\s\-+()]{7,}$/.test(v),
  precio:   (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
  cantidad: (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
  descuento:(v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 100,
  estadoPago:(v) => ['pagado','no_pagado','pendiente_de_completar'].includes(v),
  metodoPago:(v) => ['efectivo','deposito','transferencia','tarjeta','cheque','otro'].includes(v),
  role:     (v) => ['admin','empleado'].includes(v),
};

export function validateBody(spec) {
  return (req, res, next) => {
    const errors = {};
    for (const [field, rule] of Object.entries(spec)) {
      const value = req.body[field];
      const { required = false, type } = typeof rule === 'string' ? { type: rule } : rule;
      if (required && (value === undefined || value === null || value === '')) {
        errors[field] = 'Requerido';
        continue;
      }
      if (value !== undefined && value !== null && value !== '' && type && validators[type]) {
        if (!validators[type](value)) errors[field] = `Inválido (${type})`;
      }
    }
    if (Object.keys(errors).length) {
      return res.status(400).json({ error: 'Validación fallida', detalles: errors });
    }
    next();
  };
}
