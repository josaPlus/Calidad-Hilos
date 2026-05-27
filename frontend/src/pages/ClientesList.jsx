import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Edit2, Trash2, Download, Search } from 'lucide-react';
import { fetchClientes, deleteClienteThunk, setFilter } from '../redux/slices/clientesSlice.js';
import { Button, Card, Input, Badge, Modal, Spinner, EmptyState } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useExcelExport } from '../hooks/useExcelExport.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { money, fmtDate } from '../utils/constants.js';

export default function ClientesList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { exportSheet } = useExcelExport();
  const { items: clientes, loading, filter } = useSelector(s => s.clientes);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { dispatch(fetchClientes()); }, [dispatch]);

  // debounce de búsqueda
  const debounced = useDebounce(filter, 200);
  const filtrados = useMemo(() => {
    const q = debounced.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.telefono || '').includes(q) ||
      (c.ciudad || '').toLowerCase().includes(q)
    );
  }, [clientes, debounced]);

  const handleDelete = useCallback(async (id, nombre) => {
    try {
      await dispatch(deleteClienteThunk(id)).unwrap();
      toast.success(`Cliente "${nombre}" eliminado`);
      setConfirm(null);
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar');
    }
  }, [dispatch, toast]);

  const handleExport = useCallback(() => {
    exportSheet(
      filtrados.map(c => ({
        Nombre: c.nombre,
        Teléfono: c.telefono || '',
        Ciudad: c.ciudad || '',
        Domicilio: c.domicilio || '',
        Email: c.email || '',
        Estado: c.estado_cliente,
        'Descuento %': c.descuento_global || 0,
        'Ventas': c.total_ventas || 0,
        'Total comprado': c.total_comprado || 0,
        'Saldo pendiente': c.saldo_pendiente || 0,
        'Última compra': c.ultima_compra ? fmtDate(c.ultima_compra) : '',
      })),
      { filename: 'Clientes', sheetName: 'Clientes', colWidths: [22, 14, 14, 25, 22, 10, 10, 8, 14, 14, 12] }
    );
  }, [filtrados, exportSheet]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-800">Clientes</h1>
          <p className="text-stone-500 mt-1">{clientes.length} en total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleExport}><Download size={16} /> Excel</Button>
          <Button variant="accent" onClick={() => navigate('/clientes/nuevo')}><Plus size={16} /> Nuevo</Button>
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-sage/10">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-3 text-sage" />
            <input
              className="input pl-9"
              placeholder="Buscar por nombre, teléfono o ciudad…"
              value={filter}
              onChange={(e) => dispatch(setFilter(e.target.value))}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 grid place-items-center"><Spinner /></div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            title="Sin clientes"
            message="Empieza creando tu primer cliente"
            action={<Button variant="accent" onClick={() => navigate('/clientes/nuevo')}><Plus size={16}/> Nuevo cliente</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-mist text-sage uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-left">Contacto</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                  <th className="px-5 py-3 text-right">Compras</th>
                  <th className="px-5 py-3 text-right">Saldo</th>
                  <th className="px-5 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {filtrados.map(c => (
                  <tr key={c.id} className="hover:bg-leaf/40">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-stone-800">{c.nombre}</p>
                      <p className="text-xs text-stone-500">{c.ciudad || '-'}</p>
                    </td>
                    <td className="px-5 py-3 text-stone-600">
                      <p>{c.telefono || '-'}</p>
                      <p className="text-xs text-stone-400">{c.email || ''}</p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge tone={c.estado_cliente === 'activo' ? 'success' : 'danger'}>
                        {c.estado_cliente}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="font-bold text-stone-800">{c.total_ventas || 0}</p>
                      <p className="text-xs text-stone-500">{money(c.total_comprado)}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-bold ${c.saldo_pendiente > 0 ? 'text-amber' : 'text-sage'}`}>
                        {money(c.saldo_pendiente)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/clientes/${c.id}`)}
                          className="p-2 text-sage hover:bg-leaf rounded-lg"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setConfirm(c)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Eliminar cliente"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => handleDelete(confirm.id, confirm.nombre)}>Eliminar</Button>
          </>
        }
      >
        <p className="text-stone-700">
          ¿Eliminar a <strong>{confirm?.nombre}</strong>? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
