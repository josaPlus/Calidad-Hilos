import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, Users, AlertTriangle } from 'lucide-react';
import {
  ComposedChart, Line, Bar, BarChart, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useFetch } from '../hooks/useFetch.js';
import { dashboardAPI } from '../services/api.js';
import { Card, KpiCard, Spinner, Input, Badge } from '../components/UI.jsx';
import { money, fmtDate } from '../utils/constants.js';

const COLORES = ['#6A8D73', '#F0A868', '#A8D08D', '#FFE8C2', '#557060', '#E4FFE1'];

export default function DashboardFinanzas() {
  const [desde, setDesde] = useState(
    new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  );
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));

  const { data, loading, refetch } = useFetch(
    async () => (await dashboardAPI.finanzas({ desde, hasta })).data,
    [desde, hasta]
  );

  const flujoChart = useMemo(
    () => (data?.flujoDiario || []).map(d => ({
      fecha: d.fecha.slice(5),
      ingresos: d.ingresos,
      egresos: d.egresos,
      neto: d.neto,
    })),
    [data]
  );

  if (loading) return <div className="grid place-items-center h-64"><Spinner size="lg" /></div>;

  const { kpis = {}, topCategorias = [], diasNegativos = [] } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-800">
            Dashboard Financiero
          </h1>
          <p className="text-stone-500 mt-1">Ingresos, egresos y flujo neto</p>
        </div>
        <Card padding={false} className="flex flex-row gap-3 p-3">
          <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp}   label="Ingresos"    value={money(kpis.totalIngresos)} hint={`${kpis.numVentas} ventas`}    tone="sage" />
        <KpiCard icon={TrendingDown} label="Egresos"     value={money(kpis.totalEgresos)}  hint={`${kpis.numEgresos} egresos`}  tone="rose" />
        <KpiCard icon={Activity}     label="Flujo neto"  value={money(kpis.flujoNeto)}     hint={kpis.flujoNeto >= 0 ? 'Positivo' : 'Negativo'} tone={kpis.flujoNeto >= 0 ? 'sage' : 'rose'} />
        <KpiCard icon={Users}        label="Prom. por cliente" value={money(kpis.promedioPorCliente)} hint={`${kpis.clientesUnicos} clientes`} tone="amber" />
      </div>

      {/* Flujo diario */}
      <Card title="Flujo diario" subtitle="Ingresos vs egresos por día">
        {flujoChart.length === 0 ? (
          <p className="text-center text-stone-500 py-10">Sin movimientos en el período</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={flujoChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="fecha" stroke="#78716c" />
              <YAxis stroke="#78716c" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #6A8D7333' }}
                formatter={(v) => money(v)}
              />
              <Legend />
              <Bar dataKey="ingresos" fill="#6A8D73" radius={[6, 6, 0, 0]} />
              <Bar dataKey="egresos"  fill="#F0A868" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="neto" stroke="#1f2d24" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Top categorías de egresos" subtitle="Las 5 más altas del período">
          {topCategorias.length === 0 ? (
            <p className="text-center text-stone-500 py-10">Sin egresos registrados</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={topCategorias}
                  dataKey="total"
                  nameKey="categoria"
                  cx="50%" cy="50%"
                  outerRadius={100}
                  label={(e) => `${e.categoria}`}
                >
                  {topCategorias.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Días con impacto negativo" subtitle="Los 10 días con peor saldo">
          {diasNegativos.length === 0 ? (
            <div className="text-center py-10 text-sage">
              <Activity className="mx-auto mb-2" size={32} />
              <p className="font-medium">¡No hubo días negativos en el período!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {diasNegativos.map((d) => (
                <li key={d.fecha} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className="text-red-500" />
                    <div>
                      <p className="font-semibold text-stone-800">{fmtDate(d.fecha)}</p>
                      <p className="text-xs text-stone-500">
                        Ingresos {money(d.ingresos)} · Egresos {money(d.egresos)}
                      </p>
                    </div>
                  </div>
                  <Badge tone="danger">{money(d.neto)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
