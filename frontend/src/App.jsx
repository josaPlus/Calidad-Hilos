import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import DashboardClientes from './pages/DashboardClientes.jsx';
import DashboardFinanzas from './pages/DashboardFinanzas.jsx';
import DashboardHilos    from './pages/DashboardHilos.jsx';
import ClientesList      from './pages/ClientesList.jsx';
import ClienteForm       from './pages/ClienteForm.jsx';
import VentasList        from './pages/VentasList.jsx';
import VentaForm         from './pages/VentaForm.jsx';
import Pagos             from './pages/Pagos.jsx';
import EgresosPage       from './pages/Egresos.jsx';
import Productos         from './pages/Productos.jsx';
import Usuarios          from './pages/Usuarios.jsx';

function RequireAuth({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/ventas" replace />;
  return children;
}

function HomeRedirect() {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? '/dashboard/clientes' : '/ventas'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<HomeRedirect />} />

      <Route path="/dashboard/clientes" element={<RequireAuth adminOnly><Layout><DashboardClientes /></Layout></RequireAuth>} />
      <Route path="/dashboard/finanzas" element={<RequireAuth adminOnly><Layout><DashboardFinanzas /></Layout></RequireAuth>} />
      <Route path="/dashboard/hilos"    element={<RequireAuth adminOnly><Layout><DashboardHilos /></Layout></RequireAuth>} />

      <Route path="/clientes"           element={<RequireAuth adminOnly><Layout><ClientesList /></Layout></RequireAuth>} />
      <Route path="/clientes/nuevo"     element={<RequireAuth adminOnly><Layout><ClienteForm /></Layout></RequireAuth>} />
      <Route path="/clientes/:id"       element={<RequireAuth adminOnly><Layout><ClienteForm /></Layout></RequireAuth>} />

      <Route path="/ventas"             element={<RequireAuth><Layout><VentasList /></Layout></RequireAuth>} />
      <Route path="/ventas/nueva"       element={<RequireAuth><Layout><VentaForm /></Layout></RequireAuth>} />

      <Route path="/pagos"              element={<RequireAuth adminOnly><Layout><Pagos /></Layout></RequireAuth>} />

      <Route path="/egresos"            element={<RequireAuth><Layout><EgresosPage /></Layout></RequireAuth>} />

      <Route path="/productos"          element={<RequireAuth adminOnly><Layout><Productos /></Layout></RequireAuth>} />
      <Route path="/usuarios"           element={<RequireAuth adminOnly><Layout><Usuarios /></Layout></RequireAuth>} />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
