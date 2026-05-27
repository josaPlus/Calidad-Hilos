import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Select, Badge } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { clientesAPI, productosAPI } from '../services/api.js';
import { createClienteThunk, updateClienteThunk, fetchClientes } from '../redux/slices/clientesSlice.js';

export default function ClienteForm() {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const [form, setForm] = useState({
    nombre: '', telefono: '', domicilio: '', ciudad: '', email: '',
    estado_cliente: 'activo', descuento_global: 0,
  });
  const [descuentos, setDescuentos] = useState([]);
  const [productos, setProductos]   = useState([]);
  const [saving, setSaving]         = useState(false);

  // Nuevo descuento
  const [nuevoDesc, setNuevoDesc] = useState({ tipo_hilo: '', cantidad_minima: 0, porcentaje_descuento: 5 });

  useEffect(() => {
    productosAPI.list().then(({ data }) => setProductos(data.productos));
    if (editing) {
      clientesAPI.get(id).then(({ data }) => {
        const c = data.cliente;
        setForm({
          nombre: c.nombre,
          telefono: c.telefono || '',
          domicilio: c.domicilio || '',
          ciudad: c.ciudad || '',
          email: c.email || '',
          estado_cliente: c.estado_cliente,
          descuento_global: c.descuento_global || 0,
        });
        setDescuentos(data.descuentos || []);
      });
    }
  }, [id, editing]);

  const handle = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio');
    setSaving(true);
    try {
      if (editing) {
        await dispatch(updateClienteThunk({ id, data: form })).unwrap();
        toast.success('Cliente actualizado');
      } else {
        await dispatch(createClienteThunk(form)).unwrap();
        toast.success('Cliente creado');
      }
      dispatch(fetchClientes());
      nav('/clientes');
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const addDescuento = useCallback(async () => {
    if (!nuevoDesc.porcentaje_descuento || nuevoDesc.porcentaje_descuento <= 0) {
      return toast.error('Porcentaje inválido');
    }
    try {
      await clientesAPI.addDescuento(id, nuevoDesc);
      const { data } = await clientesAPI.get(id);
      setDescuentos(data.descuentos);
      setNuevoDesc({ tipo_hilo: '', cantidad_minima: 0, porcentaje_descuento: 5 });
      toast.success('Descuento agregado');
    } catch {
      toast.error('No se pudo agregar');
    }
  }, [id, nuevoDesc, toast]);

  const removeDescuento = useCallback(async (dId) => {
    try {
      await clientesAPI.removeDescuento(id, dId);
      setDescuentos(descuentos.filter(d => d.id !== dId));
      toast.success('Descuento eliminado');
    } catch { toast.error('Error'); }
  }, [id, descuentos, toast]);

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        onClick={() => nav('/clientes')}
        className="inline-flex items-center gap-2 text-sage hover:text-primary-700 font-semibold"
      >
        <ArrowLeft size={18} /> Volver
      </button>

      <div>
        <h1 className="font-display text-3xl font-extrabold text-stone-800">
          {editing ? 'Editar cliente' : 'Nuevo cliente'}
        </h1>
      </div>

      <Card title="Datos generales">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Nombre *"  value={form.nombre}    onChange={handle('nombre')}    required />
            <Input label="Teléfono"  value={form.telefono}  onChange={handle('telefono')}  placeholder="Ej. 477 123 4567" />
            <Input label="Email"     value={form.email}     onChange={handle('email')}     type="email" />
            <Input label="Ciudad"    value={form.ciudad}    onChange={handle('ciudad')} />
            <Input label="Domicilio" value={form.domicilio} onChange={handle('domicilio')} className="sm:col-span-2" />
            <Input
              label="Descuento global %"
              type="number" min="0" max="100" step="0.5"
              value={form.descuento_global}
              onChange={handle('descuento_global')}
              helper="Se aplica a todas las ventas de este cliente"
            />
            {editing && (
              <Select label="Estado" value={form.estado_cliente} onChange={handle('estado_cliente')}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </Select>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={saving}><Save size={16} /> Guardar</Button>
            <Button type="button" variant="ghost" onClick={() => nav('/clientes')}>Cancelar</Button>
          </div>
        </form>
      </Card>

      {editing && (
        <Card title="Descuentos por volumen o producto" subtitle="Se aplica el mayor entre el global y estos">
          <div className="grid sm:grid-cols-4 gap-3 items-end mb-4">
            <Select
              label="Tipo de hilo"
              value={nuevoDesc.tipo_hilo}
              onChange={(e) => setNuevoDesc({ ...nuevoDesc, tipo_hilo: e.target.value })}
            >
              <option value="">Cualquiera</option>
              {productos.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
            </Select>
            <Input
              label="Cantidad mínima"
              type="number" min="0" step="1"
              value={nuevoDesc.cantidad_minima}
              onChange={(e) => setNuevoDesc({ ...nuevoDesc, cantidad_minima: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="% descuento"
              type="number" min="0" max="100" step="0.5"
              value={nuevoDesc.porcentaje_descuento}
              onChange={(e) => setNuevoDesc({ ...nuevoDesc, porcentaje_descuento: parseFloat(e.target.value) || 0 })}
            />
            <Button onClick={addDescuento} variant="accent"><Plus size={14}/> Agregar</Button>
          </div>

          {descuentos.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-4">Sin descuentos configurados</p>
          ) : (
            <ul className="space-y-2">
              {descuentos.map(d => (
                <li key={d.id} className="flex items-center justify-between p-3 bg-mist rounded-xl">
                  <div className="flex items-center gap-3">
                    <Badge tone="info">{d.tipo_hilo || 'Cualquiera'}</Badge>
                    <span className="text-sm text-stone-600">
                      desde {d.cantidad_minima} unidades · <strong className="text-sage">{d.porcentaje_descuento}%</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => removeDescuento(d.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
