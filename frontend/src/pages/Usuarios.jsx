import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { usersAPI } from '../services/api.js';
import { Card, Button, Modal, Input, Select, Badge } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtDate } from '../utils/constants.js';

export default function Usuarios() {
  const { user: actual } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', role: 'empleado' });

  const cargar = () => usersAPI.list().then(({ data }) => setUsers(data.users));
  useEffect(() => { cargar(); }, []);

  const abrir = (u = null) => {
    setModal(u || 'new');
    setForm(u
      ? { nombre: u.nombre, email: u.email, password: '', role: u.role, activo: u.activo }
      : { nombre: '', email: '', password: '', role: 'empleado' }
    );
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (modal === 'new') {
        await usersAPI.create(form);
        toast.success('Usuario creado');
      } else {
        const patch = { nombre: form.nombre, role: form.role, activo: form.activo };
        if (form.password) patch.password = form.password;
        await usersAPI.update(modal.id, patch);
        toast.success('Usuario actualizado');
      }
      setModal(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const eliminar = async () => {
    try {
      await usersAPI.remove(confirm.id);
      toast.success('Usuario eliminado');
      setConfirm(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-800">Usuarios</h1>
          <p className="text-stone-500 mt-1">Administra accesos al sistema</p>
        </div>
        <Button variant="accent" data-testid="btn-nuevo-usuario" onClick={() => abrir()}><Plus size={16}/> Nuevo</Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mist text-sage uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-center">Rol</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-left">Registrado</th>
                <th className="px-5 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-leaf/40">
                  <td className="px-5 py-3 font-semibold text-stone-800">{u.nombre}</td>
                  <td className="px-5 py-3 text-stone-600">{u.email}</td>
                  <td className="px-5 py-3 text-center">
                    <Badge tone={u.role === 'admin' ? 'accent' : 'info'}>{u.role}</Badge>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge tone={u.activo ? 'success' : 'danger'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-5 py-3 text-stone-600">{fmtDate(u.created_at)}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => abrir(u)} className="p-2 text-sage hover:bg-leaf rounded-lg"><Edit2 size={15}/></button>
                    {u.id !== actual?.id && (
                      <button onClick={() => setConfirm(u)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg ml-1">
                        <Trash2 size={15}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nuevo usuario' : 'Editar usuario'}>
        <form onSubmit={guardar} className="space-y-4">
          <Input data-testid="input-nombre" label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          {modal === 'new' && (
            <Input data-testid="input-email" label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          )}
          <Input
            data-testid="input-password"
            label={modal === 'new' ? 'Contraseña *' : 'Nueva contraseña (opcional)'}
            type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={modal === 'new'} minLength={6}
          />
          <Select data-testid="select-rol" label="Rol" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="empleado">Empleado (solo ventas y egresos)</option>
            <option value="admin">Administrador (acceso total)</option>
          </Select>
          {modal !== 'new' && (
            <Select label="Estado" value={form.activo ? '1' : '0'} onChange={(e) => setForm({ ...form, activo: e.target.value === '1' })}>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </Select>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" data-testid="btn-guardar-usuario">Guardar</Button>
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar usuario"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminar}>Eliminar</Button>
        </>}>
        <p>¿Eliminar a <strong>{confirm?.nombre}</strong>?</p>
      </Modal>
    </div>
  );
}
