export const ESTADOS_PAGO = [
  { id: 'pagado',                  label: 'Pagado',     tone: 'success' },
  { id: 'no_pagado',               label: 'No pagado',  tone: 'danger'  },
  { id: 'pendiente_de_completar',  label: 'Pendiente',  tone: 'warning' },
];

export const METODOS_PAGO = [
  { id: 'efectivo',     label: 'Efectivo' },
  { id: 'transferencia',label: 'Transferencia' },
  { id: 'deposito',     label: 'Depósito' },
  { id: 'tarjeta',      label: 'Tarjeta' },
  { id: 'cheque',       label: 'Cheque' },
  { id: 'otro',         label: 'Otro' },
];

export function getEstadoTone(estado) {
  return ESTADOS_PAGO.find(e => e.id === estado)?.tone || 'neutral';
}
export function getEstadoLabel(estado) {
  return ESTADOS_PAGO.find(e => e.id === estado)?.label || estado;
}

export const money = (v) => `$${(Number(v) || 0).toFixed(2)}`;

export const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
