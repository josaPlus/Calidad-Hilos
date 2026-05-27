import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Download, TrendingDown } from 'lucide-react';
import {
  fetchEgresos, fetchCategorias, createEgresoThunk, deleteEgresoThunk,
} from '../redux/slices/egresosSlice.js';
import { Card, KpiCard, Button, Modal, Input, Select, Textarea, Badge, Spinner, EmptyState } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useExcelExport } from '../hooks/useExcelExport.js';
import { useAuth } from '../context/AuthContext.jsx';
import { money, fmtDate } from '../utils/constants.js';

export default function EgresosPage() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { exportSheet } = useExcelExport();
  const { isAdmin } = useAuth();
  const { items: egresos, categorias, loading } = useSelector(s => s.egresos);

  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [filtro, setFiltro] = useState({ categoria: '' });
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    categoria: '',
    concepto: '',
    monto: '',
    metodoPago: 'efectivo',
    referencia: '',
    observaciones: '',
  });

  useEffect(() => {
    dispatch(fetchEgresos());
    dispatch(fetchCategorias());
  }, [dispatch]);

  const filtrados = useMemo(
    () => egresos.filter(e => !filtro.categoria || e.categoria === filtro.categoria),
    [egresos, filtro]
  );

  const total = useMemo(() => filtrados.reduce((s, e) => s + (e.monto || 0), 0), [filtrados]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.categoria || !form.concepto || !form.monto) {
      return toast.error('Completa los campos obligatorios');
    }
    try {
      await dispatch(createEgresoThunk({
        ...form,
        monto: parseFloat(form.monto),
        fecha: new Date(form.fecha).toISOString(),
      })).unwrap();
      toast.success('Egreso registrado');
      setModal(false);
      setForm({
        fecha: new Date().toISOString().slice(0, 10),
        categoria: '', concepto: '', monto: '', metodoPago: 'efectivo',
        referencia: '', observaciones: '',
      });
    } catch (err) {
      toast.error(err.message || 'Error');
    }
  };

  const handleExport = useCallback(() => exportSheet(
    filtrados.map(e => ({
      Fecha:        fmtDate(e.fecha),
      Categoría:    e.categoria,
      Concepto:     e.concepto,
      Monto:        e.monto,
      'Método':     e.metodoPago,
      Referencia:   e.referencia || '',
      Observaciones: e.observaciones || '',
      Registró:     e.usuarioNombre || '',
    })),
    { filename: 'Egresos' }
  ), [filtrados, exportSheet]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-800">Egresos</h1>
          <p className="text-stone-500 mt-1">Gastos y salidas de dinero</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleExport}><Download size={16}/> Excel</Button>
          <Button variant="accent" onClick={() => setModal(true)}><Plus size={16}/> Nuevo egreso</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard icon={TrendingDown} label="Total egresos" value={money(total)} hint={`${filtrados.length} registros`} tone="rose" />
        <KpiCard icon={TrendingDown} label="Categorías"    value={categorias.length} tone="amber" />
        <KpiCard icon={TrendingDown} label="Promedio"      value={money(filtrados.length ? total / filtrados.length : 0)} tone="sky" />
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-sage/10 flex flex-col sm:flex-row gap-3">
          <Select value={filtro.categoria} onChange={(e) => setFiltro({ ...filtro, categoria: e.target.value })}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </Select>
        </div>

        {loading ? (
          <div className="p-10 grid place-items-center"><Spinner /></div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="Sin egresos"
            message="Registra el primer egreso"
            action={<Button variant="accent" onClick={() => setModal(true)}><Plus size={16}/> Nuevo egreso</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-mist text-sage uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Categoría</th>
                  <th className="px-5 py-3 text-left">Concepto</th>
                  <th className="px-5 py-3 text-left">Método</th>
                  <th className="px-5 py-3 text-right">Monto</th>
                  <th className="px-5 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {filtrados.map(e => (
                  <tr key={e._id} className="hover:bg-leaf/40">
                    <td className="px-5 py-3">{fmtDate(e.fecha)}</td>
                    <td className="px-5 py-3"><Badge tone="info">{e.categoria}</Badge></td>
                    <td className="px-5 py-3 text-stone-800 font-medium">
                      {e.concepto}
                      {e.observaciones && <p className="text-xs text-stone-500">{e.observaciones}</p>}
                    </td>
                    <td className="px-5 py-3 capitalize">{e.metodoPago}</td>
                    <td className="px-5 py-3 text-right font-bold text-amber">-{money(e.monto)}</td>
                    <td className="px-5 py-3 text-center">
                      {isAdmin && (
                        <button onClick={() => setConfirm(e)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={15}/>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo egreso">
        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Fecha *" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            <Select label="Categoría *" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              <option value="">— Selecciona —</option>
              {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </Select>
            <Input label="Concepto *" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                   placeholder="Ej. Compra de hilo crudo" className="sm:col-span-2" />
            <Input label="Monto *" type="number" min="0" step="0.01" value={form.monto}
                   onChange={(e) => setForm({ ...form, monto: e.target.value })} />
            <Select label="Método de pago" value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
              <option value="otro">Otro</option>
            </Select>
            <Input label="Referencia" value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                   className="sm:col-span-2" placeholder="Factura, folio, etc." />
            <div className="sm:col-span-2">
              <Textarea label="Observaciones" value={form.observaciones}
                        onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit"><Plus size={14}/> Registrar</Button>
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Eliminar egreso"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={async () => {
              await dispatch(deleteEgresoThunk(confirm._id)).unwrap();
              toast.success('Eliminado'); setConfirm(null);
            }}>Eliminar</Button>
          </>
        }
      >
        <p>¿Eliminar el egreso "<strong>{confirm?.concepto}</strong>"?</p>
      </Modal>
    </div>
  );
}
