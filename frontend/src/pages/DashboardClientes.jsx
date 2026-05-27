import { Users, UserCheck, UserX, UserPlus, Repeat } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useFetch } from '../hooks/useFetch.js';
import { dashboardAPI } from '../services/api.js';
import { Card, KpiCard, Spinner, EmptyState } from '../components/UI.jsx';
import { money } from '../utils/constants.js';
import { useMemo } from 'react';

export default function DashboardClientes() {
  const { data, loading } = useFetch(
    async () => (await dashboardAPI.clientes()).data,
    []
  );

  const chartData = useMemo(
    () => (data?.crecimientoMensual || []).map((m) => ({
      mes: m.mes.slice(2),
      nuevos: m.nuevos,
    })),
    [data]
  );

  if (loading) return <div className="grid place-items-center h-64"><Spinner size="lg" /></div>;
  if (!data)   return <EmptyState icon={Users} title="Sin datos" />;

  const { kpis, topClientes } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-800">Dashboard de Clientes</h1>
        <p className="text-stone-500 mt-1">Análisis y KPIs de tu cartera de clientes</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={Users}     label="Total"       value={kpis.totalClientes} tone="sage" />
        <KpiCard icon={UserCheck} label="Activos"     value={kpis.activos}        tone="sage" />
        <KpiCard icon={UserX}     label="Inactivos"   value={kpis.inactivos}      hint="+30 días sin compra" tone="rose" />
        <KpiCard icon={UserPlus}  label="Nuevos"      value={kpis.nuevos}         hint="últimos 30 días"      tone="amber" />
        <KpiCard icon={Repeat}    label="Recurrentes" value={kpis.recurrentes}    hint=">1 compra"            tone="sky"   />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Crecimiento mensual" subtitle="Clientes nuevos por mes (últimos 12 meses)">
          {chartData.length === 0 ? (
            <p className="text-center text-stone-500 py-10">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="mes" stroke="#78716c" />
                <YAxis stroke="#78716c" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #6A8D7333' }} />
                <Line type="monotone" dataKey="nuevos" stroke="#6A8D73" strokeWidth={3} dot={{ fill: '#F0A868', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Top 10 clientes" subtitle="Por monto comprado total">
          {topClientes.length === 0 ? (
            <p className="text-center text-stone-500 py-10">Sin ventas registradas</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topClientes} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis type="number" stroke="#78716c" />
                <YAxis type="category" dataKey="nombre" stroke="#78716c" width={120} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #6A8D7333' }}
                  formatter={(v) => money(v)}
                />
                <Bar dataKey="total_comprado" fill="#F0A868" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="Detalle de top clientes" padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mist text-sage uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Cliente</th>
                <th className="px-5 py-3 text-right">Compras</th>
                <th className="px-5 py-3 text-right">Monto total</th>
                <th className="px-5 py-3 text-right">Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {topClientes.map((c) => (
                <tr key={c.id} className="hover:bg-leaf/40">
                  <td className="px-5 py-3 font-medium text-stone-800">{c.nombre}</td>
                  <td className="px-5 py-3 text-right">{c.num_compras}</td>
                  <td className="px-5 py-3 text-right font-bold text-sage">{money(c.total_comprado)}</td>
                  <td className="px-5 py-3 text-right text-stone-600">{money(c.total_comprado / c.num_compras)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
