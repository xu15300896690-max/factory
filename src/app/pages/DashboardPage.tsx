import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { int, money } from '../lib/format';
import { Boxes, AlertTriangle, ClipboardList, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DashboardSummary {
  totalItems: number;
  totalStockValue: number;
  lowStockCount: number;
  pendingAudits: number;
  todayInbound: number;
  todayOutbound: number;
  trend: Array<{ day: string; inbound: number; outbound: number }>;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });

  if (isLoading || !data) {
    return <div className="text-slate-500">Loading…</div>;
  }

  const kpis = [
    {
      label: 'Total Items',
      value: int(data.totalItems),
      icon: Boxes,
      color: 'text-blue-600',
      to: '/inventory',
    },
    {
      label: 'Stock Value',
      value: money(data.totalStockValue),
      icon: Boxes,
      color: 'text-emerald-600',
      to: '/inventory',
    },
    {
      label: 'Low Stock',
      value: int(data.lowStockCount),
      icon: AlertTriangle,
      color: 'text-amber-600',
      to: '/low-stock',
    },
    {
      label: 'Pending Audits',
      value: int(data.pendingAudits),
      icon: ClipboardList,
      color: 'text-rose-600',
      to: '/audits?status=pending',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">Real-time overview of inventory operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to}>
            <Card className="hover:shadow-md transition cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-slate-50 ${k.color}`}>
                  <k.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{k.label}</div>
                  <div className="text-2xl font-semibold">{k.value}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Today’s Movements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700">
                <ArrowDownToLine className="w-4 h-4" />
                Inbound
              </div>
              <div className="font-semibold">{int(data.todayInbound)} units</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <ArrowUpFromLine className="w-4 h-4" />
                Outbound
              </div>
              <div className="font-semibold">{int(data.todayOutbound)} units</div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-slate-500">Net</span>
              <span
                className={`font-semibold ${
                  data.todayInbound - data.todayOutbound >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {int(data.todayInbound - data.todayOutbound)} units
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7-Day Flow</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tickFormatter={(v) => v.slice(5)} stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Bar dataKey="inbound" fill="#10b981" />
                <Bar dataKey="outbound" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}