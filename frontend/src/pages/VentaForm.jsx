import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { Card, Button, Input, Select, Textarea, Badge, EmptyState } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fetchClientes } from '../redux/slices/clientesSlice.js';
import { fetchProductos } from '../redux/slices/productosSlice.js';
import { createVentaThunk } from '../redux/slices/ventasSlice.js';
import { money } from '../utils/constants.js';

export default function VentaForm() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const toast = useToast();
  const { items: clientes } = useSelector(s => s.clientes);
  const { items: productos } = useSelector(s => s.productos);

  const [clienteId, setClienteId] = useState('');
  const [fecha, setFecha]         = useState(new Date().toISOString().slice(0, 10));
  const [estadoPago, setEstadoPago] = useState('no_pagado');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [descPct, setDescPct]       = useState(0);
  const [notas, setNotas]           = useState('');
  const [lineas, setLineas]         = useState([]);
  const [saving, setSaving]         = useState(false);

  // useRef: enfocar selector de hilo al agregar nueva línea
  const lastRowRef = useRef(null);

  useEffect(() => {
    dispatch(fetchClientes());
    dispatch(fetchProductos());
  }, [dispatch]);

  const totales = useMemo(() => {
    const subtotal = lineas.reduce((s, l) => s + (l.cantidad * l.precio_unitario || 0), 0);
    const cliente = clientes.find(c => c.id === parseInt(clienteId));
    const descCliente = cliente?.descuento_global || 0;
    const descFinal = Math.max(descPct || 0, descCliente);
    const descMonto = subtotal * (descFinal / 100);
    const total = subtotal - descMonto;
    return { subtotal, descPct: descFinal, descMonto, total };
  }, [lineas, clienteId, descPct, clientes]);

  const agregarLinea = useCallback(() => {
    const def = productos[0];
    setLineas(prev => [...prev, {
      id: Date.now(),
      tipo_hilo: def?.nombre || '',
      producto_id: def?.id || null,
      cantidad: 1,
      precio_unitario: def?.precio_base || 0,
    }]);
    setTimeout(() => lastRowRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [productos]);

  const actualizarLinea = useCallback((i, patch) => {
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }, []);

  const eliminarLinea = useCallback((i) => {
    setLineas(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!clienteId)        return toast.error('Selecciona un cliente');
    if (lineas.length === 0) return toast.error('Agrega al menos una línea');
    if (lineas.some(l => !l.tipo_hilo || !l.cantidad || !l.precio_unitario)) {
      return toast.error('Completa todas las líneas');
    }

    setSaving(true);
    try {
      const r = await dispatch(createVentaThunk({
        clienteId: parseInt(clienteId),
        fechaVenta: fecha,
        estadoPago,
        metodoPago: estadoPago === 'pagado' ? metodoPago : null,
        descuentoPorcentaje: descPct,
        notas: notas || null,
        detalles: lineas.map(l => ({
          tipo_hilo: l.tipo_hilo,
          producto_id: l.producto_id,
          cantidad: parseFloat(l.cantidad),
          precio_unitario: parseFloat(l.precio_unitario),
        })),
      })).unwrap();
      toast.success(`Venta #${r.numero_nota} creada`);
      nav('/ventas');
    } catch (err) {
      toast.error(err.message || 'Error al crear venta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => nav('/ventas')} className="inline-flex items-center gap-2 text-sage hover:text-primary-700 font-semibold">
        <ArrowLeft size={18}/> Volver
      </button>

      <div>
        <h1 className="font-display text-3xl font-extrabold text-stone-800">Nueva venta</h1>
        <p className="text-stone-500 mt-1">Registra una nota de remisión</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card title="Datos de la venta">
          <div className="grid sm:grid-cols-3 gap-4">
            <Select label="Cliente *" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
              <option value="">— Selecciona —</option>
              {clientes.filter(c => c.estado_cliente === 'activo').map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </Select>
            <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <Input
              label="Descuento manual %"
              type="number" min="0" max="100" step="0.5"
              value={descPct}
              onChange={(e) => setDescPct(parseFloat(e.target.value) || 0)}
              helper={`Cliente: ${clientes.find(c => c.id === +clienteId)?.descuento_global || 0}%`}
            />
          </div>
        </Card>

        <Card title={`Líneas de productos (${lineas.length})`} action={
          <Button type="button" variant="accent" size="sm" onClick={agregarLinea}><Plus size={14}/> Agregar</Button>
        }>
          {lineas.length === 0 ? (
            <EmptyState title="Sin líneas" message="Agrega productos para esta venta" />
          ) : (
            <div className="space-y-3">
              {lineas.map((l, i) => (
                <div key={l.id} ref={i === lineas.length - 1 ? lastRowRef : null} className="grid grid-cols-12 gap-2 items-end">
                  <Select
                    label={i === 0 ? 'Tipo de hilo' : ''}
                    value={l.tipo_hilo}
                    onChange={(e) => {
                      const prod = productos.find(p => p.nombre === e.target.value);
                      actualizarLinea(i, {
                        tipo_hilo: e.target.value,
                        producto_id: prod?.id || null,
                        precio_unitario: l.precio_unitario || prod?.precio_base || 0,
                      });
                    }}
                  >
                    {productos.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                  </Select>
                  <Input
                    label={i === 0 ? 'Cantidad' : ''}
                    type="number" min="0.01" step="0.01"
                    value={l.cantidad}
                    onChange={(e) => actualizarLinea(i, { cantidad: parseFloat(e.target.value) || 0 })}
                    className="col-span-2"
                  />
                  <Input
                    label={i === 0 ? 'Precio unit' : ''}
                    type="number" min="0" step="0.01"
                    value={l.precio_unitario}
                    onChange={(e) => actualizarLinea(i, { precio_unitario: parseFloat(e.target.value) || 0 })}
                    className="col-span-2"
                  />
                  <div className="col-span-2 text-right pr-2">
                    {i === 0 && <p className="label">Subtotal</p>}
                    <p className="font-bold text-sage py-2.5">{money(l.cantidad * l.precio_unitario)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarLinea(i)}
                    className="col-span-1 p-2.5 text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 size={16}/>
                  </button>
                  <div className="col-span-5 sm:hidden"></div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Pago y notas">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <Select label="Estado de pago" value={estadoPago} onChange={(e) => setEstadoPago(e.target.value)}>
              <option value="no_pagado">No pagado</option>
              <option value="pendiente_de_completar">Pendiente</option>
              <option value="pagado">Pagado</option>
            </Select>
            {estadoPago === 'pagado' && (
              <Select label="Método de pago" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="deposito">Depósito</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
                <option value="otro">Otro</option>
              </Select>
            )}
          </div>
          <Textarea label="Observaciones" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Card>

        <Card title="Resumen">
          <div className="bg-mist p-5 rounded-xl space-y-2">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">{money(totales.subtotal)}</span></div>
            <div className="flex justify-between text-amber">
              <span>Descuento ({totales.descPct}%)</span>
              <span className="font-semibold">-{money(totales.descMonto)}</span>
            </div>
            <div className="flex justify-between text-2xl font-display font-extrabold text-sage border-t border-sage/20 pt-2">
              <span>Total</span><span>{money(totales.total)}</span>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" loading={saving} size="lg"><Save size={18}/> Guardar venta</Button>
          <Button type="button" variant="ghost" onClick={() => nav('/ventas')} size="lg">Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
