import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Edit2 } from 'lucide-react';
import { fetchProductos } from '../redux/slices/productosSlice.js';
import { productosAPI } from '../services/api.js';
import { Card, Button, Modal, Input, Badge } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { money } from '../utils/constants.js';

export default function Productos() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { items: productos, loading } = useSelector(s => s.productos);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ codigo: '', nombre: '', precio_base: 0 });

  useEffect(() => { dispatch(fetchProductos()); }, [dispatch]);

  const abrir = (p = null) => {
    setModal(p || 'new');
    setForm(p ? { codigo: p.codigo, nombre: p.nombre, precio_base: p.precio_base } : { codigo: '', nombre: '', precio_base: 0 });
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (modal === 'new') {
        await productosAPI.create(form);
        toast.success('Producto creado');
      } else {
        await productosAPI.update(modal.id, form);
        toast.success('Producto actualizado');
      }
      setModal(null);
      dispatch(fetchProductos());
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-800">Catálogo de hilos</h1>
          <p className="text-stone-500 mt-1">{productos.length} tipos registrados</p>
        </div>
        <Button variant="accent" onClick={() => abrir()}><Plus size={16}/> Nuevo</Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mist text-sage uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Código</th>
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-right">Precio base</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {productos.map(p => (
                <tr key={p.id} className="hover:bg-leaf/40">
                  <td className="px-5 py-3"><Badge tone="info">{p.codigo}</Badge></td>
                  <td className="px-5 py-3 font-semibold text-stone-800">{p.nombre}</td>
                  <td className="px-5 py-3 text-right font-bold text-sage">{money(p.precio_base)}</td>
                  <td className="px-5 py-3 text-center">
                    <Badge tone={p.activo ? 'success' : 'danger'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => abrir(p)} className="p-2 text-sage hover:bg-leaf rounded-lg"><Edit2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nuevo producto' : 'Editar producto'}>
        <form onSubmit={guardar} className="space-y-4">
          {modal === 'new' && (
            <Input label="Código *" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                   placeholder="Ej. HILO50" required />
          )}
          <Input label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <Input label="Precio base" type="number" min="0" step="0.01" value={form.precio_base}
                 onChange={(e) => setForm({ ...form, precio_base: parseFloat(e.target.value) || 0 })} />
          <div className="flex gap-2">
            <Button type="submit">Guardar</Button>
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
