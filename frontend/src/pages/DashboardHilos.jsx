import { useState, useMemo } from 'react';
import { BarChart3, Package, Trophy } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useFetch } from '../hooks/useFetch.js';
import { dashboardAPI } from '../services/api.js';
import { Card, KpiCard, Spinner, Input, EmptyState } from '../components/UI.jsx';
import { money } from '../utils/constants.js';

const COLORS = ['#6A8D73', '#F0A868', '#A8D08D', '#557060', '#FFE8C2', '#E4FFE1', '#1f2d24'];

export default function DashboardHilos() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data, loading } = useFetch(
    async () => (await dashboardAPI.hilos({ desde: desde || undefined, hasta: hasta || undefined })).data,
    [desde, hasta]
  );

  const chartData = useMemo(
    () => (data?.topHilos || []).map(h => ({
      nombre: h.tipo_hilo,
      monto:  h.monto_total,
      cant:   h.cantidad_total,
    })),
    [data]
  );

  if (loading) return <div className="grid place-items-center h-64"><Spinner size="lg" /></div>;

  const { kpis = {}, topHilos = [] } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-800">Dashboard de Hilos</h1>
          <p className="text-stone-500 mt-1">Los productos que más venden</p>
        </div>
        <Card padding={false} className="flex flex-row gap-3 p-3">
          <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Package}    label="Tipos vendidos"  value={kpis.totalProductos}             tone="sage" />
        <KpiCard icon={BarChart3}  label="Monto vendido"   value={money(kpis.totalMontoVendido)}   tone="amber" />
        <KpiCard icon={BarChart3}  label="Cantidad"        value={Number(kpis.totalCantidadVendida || 0).toFixed(0)} tone="sky" />
        <KpiCard icon={Trophy}     label="Top hilo"        value={kpis.topProducto}                tone="sage" />
      </div>

      <Card title="Ranking por monto vendido">
        {chartData.length === 0 ? (
          <EmptyState icon={Package} title="Aún no hay ventas" message="Registra ventas para ver el ranking" />
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={chartData} margin={{ top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="nombre" stroke="#78716c" />
              <YAxis stroke="#78716c" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #6A8D7333' }}
                formatter={(v) => money(v)}
              />
              <Bar dataKey="monto" radius={[8, 8, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Detalle" padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mist text-sage uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Hilo</th>
                <th className="px-5 py-3 text-right">Cantidad</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3 text-right">Ventas</th>
                <th className="px-5 py-3 text-right">% Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {topHilos.map((h, i) => (
                <tr key={h.tipo_hilo} className="hover:bg-leaf/40">
                  <td className="px-5 py-3 font-medium text-stone-800">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: COLORS[i % COLORS.length] }} />
                    {h.tipo_hilo}
                  </td>
                  <td className="px-5 py-3 text-right">{Number(h.cantidad_total || 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-bold text-sage">{money(h.monto_total)}</td>
                  <td className="px-5 py-3 text-right">{h.num_ventas}</td>
                  <td className="px-5 py-3 text-right">{h.porcentaje_monto}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
