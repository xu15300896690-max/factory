import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { api, downloadFile } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const flow = useQuery({
    queryKey: ['reports', 'flow', period],
    queryFn: () => api.get<{ flow: Array<{ day: string; inbound: number; outbound: number }> }>(`/reports/flow?period=${period}`),
  });
  const categories = useQuery({
    queryKey: ['reports', 'categories'],
    queryFn: () =>
      api.get<{
        categories: Array<{ name: string; color: string; item_count: number; total_stock: number; value: number }>;
      }>('/reports/categories'),
  });
  const turnover = useQuery({
    queryKey: ['reports', 'turnover', period],
    queryFn: () => api.get<{ turnover: Array<{ day: string; movements: number; units: number }> }>(`/reports/turnover?period=${period}`),
  });
  const topMovers = useQuery({
    queryKey: ['reports', 'top-movers', period],
    queryFn: () =>
      api.get<{ topMovers: Array<{ id: number; sku: string; name: string; movements: number; units: number }> }>(
        `/reports/top-movers?period=${period}`,
      ),
  });

  async function exportCsv(type: 'stock' | 'audits' | 'lowStock'): Promise<void> {
    try {
      const filename =
        type === 'stock' ? 'stock.csv' : type === 'audits' ? 'audits.csv' : 'low-stock.csv';
      await downloadFile(`/reports/export.csv?type=${type}`, filename);
      toast.success(`Downloaded ${filename}`);
    } catch {
      toast.error('Export failed');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-slate-500">Trends and analytics across inventory operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => exportCsv('stock')}>
          <Download className="w-4 h-4 mr-2" />
          Export stock CSV
        </Button>
        <Button variant="outline" onClick={() => exportCsv('audits')}>
          <Download className="w-4 h-4 mr-2" />
          Export audits CSV
        </Button>
        <Button variant="outline" onClick={() => exportCsv('lowStock')}>
          <Download className="w-4 h-4 mr-2" />
          Export low stock CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Flow (Inbound vs Outbound)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flow.data?.flow ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tickFormatter={(v) => v.slice(5)} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="inbound" fill="#10b981" name="Inbound" />
                <Bar dataKey="outbound" fill="#ef4444" name="Outbound" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories.data?.categories ?? []}
                  dataKey="total_stock"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                >
                  {(categories.data?.categories ?? []).map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Turnover</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={turnover.data?.turnover ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tickFormatter={(v) => v.slice(5)} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="movements" stroke="#3b82f6" name="Movements" />
                <Line type="monotone" dataKey="units" stroke="#8b5cf6" name="Units" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Movers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">SKU</th>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-right px-4 py-2">Movements</th>
                  <th className="text-right px-4 py-2">Units</th>
                </tr>
              </thead>
              <tbody>
                {topMovers.data?.topMovers.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{m.sku}</td>
                    <td className="px-4 py-2">{m.name}</td>
                    <td className="px-4 py-2 text-right">{m.movements}</td>
                    <td className="px-4 py-2 text-right">{m.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}