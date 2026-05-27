import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Eye, Download, Search } from 'lucide-react';
import { fetchVentas, deleteVentaThunk } from '../redux/slices/ventasSlice.js';
import { Card, Button, Badge, Modal, Spinner, EmptyState } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useExcelExport } from '../hooks/useExcelExport.js';
import { useAuth } from '../context/AuthContext.jsx';
import { money, fmtDate, getEstadoTone, getEstadoLabel } from '../utils/constants.js';

export default function VentasList() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const toast = useToast();
  const { exportSheet } = useExcelExport();
  const { isAdmin } = useAuth();
  const { items: ventas, loading } = useSelector(s => s.ventas);

  const [filtros, setFiltros] = useState({ q: '', estado: '', desde: '', hasta: '' });
  const [detalle, setDetalle] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { dispatch(fetchVentas()); }, [dispatch]);

  const filtrados = useMemo(() => {
    return ventas.filter(v => {
      if (filtros.estado && v.estado_pago !== filtros.estado) return false;
      if (filtros.desde && new Date(v.fecha_venta) < new Date(filtros.desde)) return false;
      if (filtros.hasta && new Date(v.fecha_venta) > new Date(filtros.hasta + 'T23:59:59')) return false;
      if (filtros.q) {
        const q = filtros.q.toLowerCase();
        return (v.cliente_nombre || '').toLowerCase().includes(q) ||
               String(v.numero_nota).includes(q);
      }
      return true;
    });
  }, [ventas, filtros]);

  const handleDelete = useCallback(async (id, num) => {
    try {
      await dispatch(deleteVentaThunk(id)).unwrap();
      toast.success(`Venta #${num} eliminada`);
      setConfirm(null);
    } catch (err) {
      toast.error(err.message || 'Error');
    }
  }, [dispatch, toast]);

  const handleExport = useCallback(() => {
    exportSheet(
      filtrados.flatMap(v =>
        (v.detalles?.length ? v.detalles : [{}]).map(d => ({
          'Nota #':       v.numero_nota,
          'Fecha':        fmtDate(v.fecha_venta),
          'Cliente':      v.cliente_nombre,
          'Vendedor':     v.usuario_nombre,
          'Tipo hilo':    d.tipo_hilo || '-',
          'Cantidad':     d.cantidad || '',
          'Precio unit':  d.precio_unitario || '',
          'Subtotal':     d.subtotal || '',
          'Total nota':   v.monto_final,
          'Descuento':    v.descuento_aplicado,
          'Estado':       getEstadoLabel(v.estado_pago),
          'Método pago':  v.metodo_pago || '',
          'Notas':        v.notas || '',
        }))
      ),
      { filename: 'Ventas', sheetName: 'Ventas' }
    );
  }, [filtrados, exportSheet]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-800">Ventas</h1>
          <p className="text-stone-500 mt-1">{ventas.length} notas en total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleExport}><Download size={16}/> Excel</Button>
          <Button variant="accent" onClick={() => nav('/ventas/nueva')}><Plus size={16}/> Nueva venta</Button>
        </div>
      </div>

      <Card>
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-sage" />
            <input
              className="input pl-9"
              placeholder="Cliente o #nota…"
              value={filtros.q}
              onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
            />
          </div>
          <select className="input" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="pagado">Pagado</option>
            <option value="no_pagado">No pagado</option>
            <option value="pendiente_de_completar">Pendiente</option>
          </select>
          <input type="date" className="input" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
          <input type="date" className="input" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
        </div>
      </Card>

      <Card padding={false}>
        {loading ? (
          <div className="p-10 grid place-items-center"><Spinner /></div>
        ) : filtrados.length === 0 ? (
          <EmptyState title="Sin ventas" message="Crea tu primera venta" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-mist text-sage uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">#Nota</th>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Pendiente</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                  <th className="px-5 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {filtrados.map(v => (
                  <tr key={v.id} className="hover:bg-leaf/40">
                    <td className="px-5 py-3 font-bold text-sage">#{v.numero_nota}</td>
                    <td className="px-5 py-3 text-stone-600">{fmtDate(v.fecha_venta)}</td>
                    <td className="px-5 py-3 text-stone-800 font-medium">{v.cliente_nombre}</td>
                    <td className="px-5 py-3 text-right font-bold">{money(v.monto_final)}</td>
                    <td className="px-5 py-3 text-right text-amber font-bold">{money(v.monto_pendiente)}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge tone={getEstadoTone(v.estado_pago)}>{getEstadoLabel(v.estado_pago)}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setDetalle(v)} className="p-2 text-sage hover:bg-leaf rounded-lg"><Eye size={15}/></button>
                        {isAdmin && v.estado_pago !== 'pagado' && (
                          <button onClick={() => setConfirm(v)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={15}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`Venta #${detalle?.numero_nota}`} size="lg">
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-stone-500">Cliente</p><p className="font-semibold">{detalle.cliente_nombre}</p></div>
              <div><p className="text-xs text-stone-500">Fecha</p><p className="font-semibold">{fmtDate(detalle.fecha_venta)}</p></div>
              <div><p className="text-xs text-stone-500">Vendedor</p><p className="font-semibold">{detalle.usuario_nombre}</p></div>
              <div><p className="text-xs text-stone-500">Estado</p><Badge tone={getEstadoTone(detalle.estado_pago)}>{getEstadoLabel(detalle.estado_pago)}</Badge></div>
            </div>

            <div className="border border-sage/15 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-mist text-sage text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Hilo</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/10">
                  {detalle.detalles?.map((d, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{d.tipo_hilo}</td>
                      <td className="px-3 py-2 text-right">{d.cantidad}</td>
                      <td className="px-3 py-2 text-right">{money(d.precio_unitario)}</td>
                      <td className="px-3 py-2 text-right font-bold">{money(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-mist p-4 rounded-xl space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(detalle.monto_total)}</span></div>
              <div className="flex justify-between text-amber"><span>Descuento</span><span>-{money(detalle.descuento_aplicado)}</span></div>
              <div className="flex justify-between font-bold text-base text-sage border-t border-sage/15 pt-1 mt-1">
                <span>Total</span><span>{money(detalle.monto_final)}</span>
              </div>
              {detalle.total_pagado > 0 && (
                <div className="flex justify-between text-stone-600"><span>Pagado</span><span>{money(detalle.total_pagado)}</span></div>
              )}
              <div className="flex justify-between font-bold text-amber">
                <span>Pendiente</span><span>{money(detalle.monto_pendiente)}</span>
              </div>
            </div>

            {detalle.notas && (
              <div className="text-sm text-stone-600 bg-cream/40 p-3 rounded-xl">
                <p className="text-xs font-bold uppercase text-sage mb-1">Notas</p>
                {detalle.notas}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Eliminar venta"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => handleDelete(confirm.id, confirm.numero_nota)}>Eliminar</Button>
          </>
        }
      >
        <p>¿Eliminar la venta <strong>#{confirm?.numero_nota}</strong>? No se puede deshacer.</p>
      </Modal>
    </div>
  );
}
