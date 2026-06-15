import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Cable, Mail, Lock, User as UserIcon } from 'lucide-react';
import { Button, Input } from '../components/UI.jsx';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const handle = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = mode === 'login'
        ? await login(form.email, form.password)
        : await register(form);
      toast.success(`Bienvenido${user?.nombre ? `, ${user.nombre}` : ''}`);
      nav(user.role === 'admin' ? '/dashboard/clientes' : '/ventas');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* === Panel izquierdo: branding / logo === */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-leaf blur-3xl opacity-70 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cream blur-3xl opacity-80 pointer-events-none" />

        <div className="relative">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-sage grid place-items-center text-white shadow-soft">
              <Cable size={30} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-extrabold text-stone-800">HilosApp</h1>
              <p className="text-xs text-sage font-bold uppercase tracking-widest">Sistema de gestión</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <h2 className="font-display text-5xl font-extrabold text-stone-800 leading-tight">
            Hila tu negocio,<br />
            <span className="text-sage italic">cuenta cada hilo.</span>
          </h2>
          <p className="text-stone-600 mt-4 max-w-md">
            Ventas, cobros, egresos y reportes para tu negocio de hilos en una sola
            herramienta, simple y diseñada para que cualquiera la use.
          </p>
        </div>

        <p className="relative text-xs text-stone-500">© {new Date().getFullYear()} HilosApp · SQLite + MongoDB</p>
      </div>

      {/* === Panel derecho: formulario === */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-sage grid place-items-center text-white">
                <Cable size={26} />
              </div>
              <h1 className="font-display text-2xl font-extrabold text-stone-800">HilosApp</h1>
            </div>
          </div>

          <div className="card p-8">
            <div className="flex gap-2 mb-6 bg-mist p-1 rounded-xl">
              <button
                data-testid="btn-modo-login"
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
                  ${mode === 'login' ? 'bg-white text-sage shadow-sm' : 'text-stone-500'}`}
              >
                Iniciar sesión
              </button>
              <button
                data-testid="btn-modo-registro"
                onClick={() => setMode('register')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
                  ${mode === 'register' ? 'bg-white text-sage shadow-sm' : 'text-stone-500'}`}
              >
                Registrarse
              </button>
            </div>

            <h2 className="font-display text-2xl font-bold text-stone-800 mb-1">
              {mode === 'login' ? 'Bienvenido' : 'Crea tu cuenta'}
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              {mode === 'login'
                ? 'Ingresa con tu correo y contraseña'
                : 'El primer usuario registrado será el administrador'}
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-9 text-sage" />
                  <Input
                    data-testid="input-nombre"
                    label="Nombre"
                    placeholder="Tu nombre completo"
                    value={form.nombre}
                    onChange={handle('nombre')}
                    required
                    className="[&_input]:pl-9"
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={16} className="absolute left-3 top-9 text-sage" />
                <Input
                  data-testid="input-email"
                  label="Correo"
                  type="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={handle('email')}
                  required
                  className="[&_input]:pl-9"
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3 top-9 text-sage" />
                <Input
                  data-testid="input-password"
                  label="Contraseña"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={handle('password')}
                  minLength={6}
                  required
                  className="[&_input]:pl-9"
                />
              </div>

              <Button type="submit" data-testid="btn-login" loading={submitting} className="w-full" size="lg">
                {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </Button>
            </form>

            {mode === 'login' && (
              <div className="mt-6 p-3 bg-mist rounded-xl text-xs text-stone-600">
                <p className="font-bold text-sage mb-1">Cuenta demo</p>
                <p>admin@hilos.app · admin123</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
