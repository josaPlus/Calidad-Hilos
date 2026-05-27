import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingCart, DollarSign, Receipt,
  BarChart3, Package, Settings, LogOut, Cable,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { memo, useMemo } from 'react';

const ITEMS = [
  { to: '/dashboard/clientes', label: 'Dashboard Clientes',  icon: Users,            adminOnly: true  },
  { to: '/dashboard/finanzas', label: 'Dashboard Finanzas',  icon: DollarSign,       adminOnly: true  },
  { to: '/dashboard/hilos',    label: 'Dashboard Hilos',     icon: BarChart3,        adminOnly: true  },
  { to: '/clientes',           label: 'Clientes',            icon: Users,            adminOnly: true  },
  { to: '/ventas',             label: 'Ventas',              icon: ShoppingCart,     adminOnly: false },
  { to: '/ventas/nueva',       label: 'Nueva venta',         icon: ShoppingCart,     adminOnly: false },
  { to: '/pagos',              label: 'Pagos',               icon: Receipt,          adminOnly: true  },
  { to: '/egresos',            label: 'Egresos',             icon: DollarSign,       adminOnly: false },
  { to: '/productos',          label: 'Catálogo de hilos',   icon: Package,          adminOnly: true  },
  { to: '/usuarios',           label: 'Usuarios',            icon: Settings,         adminOnly: true  },
];

function Sidebar({ open, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // useMemo: solo recalcula menú visible si cambia el rol
  const visibleItems = useMemo(
    () => ITEMS.filter((it) => !it.adminOnly || isAdmin),
    [isAdmin]
  );

  const handleLogout = async () => {
    await logout();
    toast.info('Sesión cerrada');
    navigate('/login');
  };

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          onClick={onClose}
          className="lg:hidden fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-30"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white/80 backdrop-blur-xl
          border-r border-sage/15 flex flex-col transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* === Logo de la empresa === */}
        <div className="px-5 py-6 border-b border-sage/10">
          <div className="flex items-center gap-3">
            {/* Espacio para logo personalizable: reemplaza este bloque por <img src="/logo.png" /> */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sage to-primary-700 grid place-items-center text-white shadow-soft">
              <Cable size={26} />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold text-stone-800 leading-tight">HilosApp</h1>
              <p className="text-[10px] uppercase tracking-widest text-sage font-bold">Gestor de Ventas</p>
            </div>
          </div>
        </div>

        {/* === Usuario === */}
        <div className="px-5 py-4 border-b border-sage/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber text-stone-900 grid place-items-center font-bold">
              {user?.nombre?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800 truncate">{user?.nombre}</p>
              <p className="text-xs text-sage uppercase tracking-wider font-bold">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* === Navegación === */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/ventas'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition
                 ${isActive
                   ? 'bg-sage text-white shadow-soft'
                   : 'text-stone-600 hover:bg-leaf hover:text-sage'}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* === Logout === */}
        <div className="p-3 border-t border-sage/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-600 hover:bg-red-50 hover:text-red-700 transition text-sm font-medium"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

export default memo(Sidebar);
