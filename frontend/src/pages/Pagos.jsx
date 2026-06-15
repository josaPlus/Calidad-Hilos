import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DollarSign, Receipt, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { fetchSaldos, fetchPagos, registrarPagoThunk } from '../redux/slices/pagosSlice.js';
import { fetchVentas } from '../redux/slices/ventasSlice.js';
import { Card, KpiCard, Button, Modal, Input, Select, Badge, Spinner } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useExcelExport } from '../hooks/useExcelExport.js';
import { money, fmtDate } from '../utils/constants.js';

export default function Pagos() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { exportSheet } = useExcelExport();

  const { saldos, items: pagos } = useSelector(s => s.pagos);
  const { items: ventas }        = useSelector(s => s.ventas);

  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState({ notaId: '', montoPagado: 0, metodoPago: 'efectivo', fechaPago: '', referencia: '' });

  useEffect(() => {
    dispatch(fetchSaldos());
    dispatch(fetchPagos());
    dispatch(fetchVentas());
  }, [dispatch]);

  const kpis = useMemo(() => {
    const totalVendido   = ventas.reduce((s, v) => s + (v.monto_final || 0), 0);
    const totalPagado    = ventas.reduce((s, v) => s + ((v.monto_final || 0) - (v.monto_pendiente || 0)), 0);
    const totalPendiente = saldos.reduce((s, x) => s + (x.monto_pendiente || 0), 0);
    return { totalVendido, totalPagado, totalPendiente };
  }, [ventas, saldos]);

  const notasDelCliente = useCallback((clienteId) => {
    return ventas.filter(v =>
      v.cliente_id === clienteId &&
      ['no_pagado', 'pendiente_de_completar'].includes(v.estado_pago)
    );
  }, [ventas]);

  const abrirModal = (saldo) => {
    setModal(saldo);
    setForm({
      notaId: '',
      montoPagado: 0,
      metodoPago: 'efectivo',
      fechaPago: new Date().toISOString().slice(0, 10),
      referencia: '',
    });
  };

  const onRegistrar = async (e) => {
    e.preventDefault();
    if (!form.notaId)         return toast.error('Selecciona la nota');
    if (form.montoPagado <= 0) return toast.error('Monto inválido');

    try {
      await dispatch(registrarPagoThunk({
        notaId: parseInt(form.notaId),
        montoPagado: parseFloat(form.montoPagado),
        metodoPago: form.metodoPago,
        fechaPago: form.fechaPago,
        referencia: form.referencia || null,
      })).unwrap();
      toast.success('Pago registrado');
      setModal(null);
      dispatch(fetchSaldos());
      dispatch(fetchPagos());
      dispatch(fetchVentas());
    } catch (err) {
      toast.error(err.message || 'Error');
    }
  };

  const handleExport = () => exportSheet(
    saldos.map(s => ({
      Cliente: s.nombre_cliente,
      Teléfono: s.telefono || '',
      'Monto total': s.monto_total,
      'Pendiente':   s.monto_pendiente,
      'Última compra': s.ultima_compra ? fmtDate(s.ultima_compra) : '',
    })),
    { filename: 'Saldos_Pendientes' }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-800">Pagos</h1>
          <p className="text-stone-500 mt-1">Cobros pendientes y registro de pagos</p>
        </div>
        <Button variant="ghost" onClick={handleExport}><Download size={16}/> Excel</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={Receipt}        label="Total vendido" value={money(kpis.totalVendido)}   tone="sage" />
        <KpiCard icon={CheckCircle2}   label="Cobrado"       value={money(kpis.totalPagado)}    tone="sage" />
        <KpiCard icon={AlertCircle}    label="Por cobrar"    value={money(kpis.totalPendiente)} tone="amber" />
      </div>

      <Card title="Clientes con saldo pendiente" padding={false}>
        {saldos.length === 0 ? (
          <div className="text-center py-12 text-sage">
            <CheckCircle2 className="mx-auto mb-3" size={40} />
            <p className="font-bold">¡Sin saldos pendientes!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-mist text-sage uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Pendiente</th>
                  <th className="px-5 py-3 text-center">% Pagado</th>
                  <th className="px-5 py-3 text-right">Última compra</th>
                  <th className="px-5 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {saldos.map(s => {
                  const pct = s.monto_total ? Math.round((s.monto_total - s.monto_pendiente) / s.monto_total * 100) : 0;
                  return (
                    <tr key={s.cliente_id} className="hover:bg-leaf/40">
                      <td className="px-5 py-3 font-semibold text-stone-800">{s.nombre_cliente}</td>
                      <td className="px-5 py-3 text-right">{money(s.monto_total)}</td>
                      <td className="px-5 py-3 text-right"><Badge tone="warning">{money(s.monto_pendiente)}</Badge></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-sage/10 rounded-full overflow-hidden">
                            <div className="h-full bg-sage" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-stone-500 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-stone-600">{s.ultima_compra ? fmtDate(s.ultima_compra) : '-'}</td>
                      <td className="px-5 py-3 text-center">
                        <Button size="sm" variant="accent" data-testid="btn-registrar-pago" onClick={() => abrirModal(s)}>Registrar pago</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Historial de pagos" padding={false}>
        {pagos.length === 0 ? (
          <div className="text-center py-10 text-stone-500 text-sm">Aún no hay pagos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-mist text-sage uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-left">Nota</th>
                  <th className="px-5 py-3 text-left">Método</th>
                  <th className="px-5 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {pagos.map(p => (
                  <tr key={p.id} className="hover:bg-leaf/40">
                    <td className="px-5 py-3">{fmtDate(p.fecha_pago)}</td>
                    <td className="px-5 py-3 font-medium">{p.cliente_nombre}</td>
                    <td className="px-5 py-3"><Badge tone="info">#{p.numero_nota}</Badge></td>
                    <td className="px-5 py-3 capitalize">{p.metodo_pago}</td>
                    <td className="px-5 py-3 text-right font-bold text-sage">{money(p.monto_pagado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={`Pago — ${modal?.nombre_cliente}`}>
        {modal && (
          <form onSubmit={onRegistrar} className="space-y-4">
            <div className="bg-mist p-3 rounded-xl text-sm flex justify-between">
              <span>Pendiente:</span>
              <strong className="text-amber">{money(modal.monto_pendiente)}</strong>
            </div>
            <Select label="Nota a pagar" value={form.notaId} onChange={(e) => {
              const venta = ventas.find(v => v.id === parseInt(e.target.value));
              setForm({ ...form, notaId: e.target.value, montoPagado: venta?.monto_pendiente || 0 });
            }}>
              <option value="">— Selecciona —</option>
              {notasDelCliente(modal.cliente_id).map(v => (
                <option key={v.id} value={v.id}>Nota #{v.numero_nota} · {money(v.monto_pendiente)}</option>
              ))}
            </Select>
            <Input label="Monto" data-testid="input-monto" type="number" step="0.01" value={form.montoPagado}
                   onChange={(e) => setForm({ ...form, montoPagado: parseFloat(e.target.value) || 0 })} />
            <Input label="Fecha" data-testid="input-fecha-pago" type="date" value={form.fechaPago}
                   onChange={(e) => setForm({ ...form, fechaPago: e.target.value })} />
            <Select label="Método" data-testid="select-metodo" value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="deposito">Depósito</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
              <option value="otro">Otro</option>
            </Select>
            <Input label="Referencia (opcional)" value={form.referencia}
                   onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
            <div className="flex gap-2 pt-2">
              <Button type="submit" data-testid="btn-guardar-pago"><DollarSign size={16}/> Registrar pago</Button>
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
