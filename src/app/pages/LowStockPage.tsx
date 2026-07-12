import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { int } from '../lib/format';

interface LowStockItem {
  id: number;
  sku: string;
  name: string;
  category_name: string | null;
  warehouse_name: string | null;
  location: string;
  stock: number;
  min_stock: number;
  supplier: string;
}

export default function LowStockPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['items', 'low'],
    queryFn: () => api.get<{ items: LowStockItem[]; total: number }>('/items?lowStock=1&pageSize=100'),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Low Stock Alerts</h1>
        <p className="text-sm text-slate-500">
          {data?.total ?? 0} items at or below minimum level
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items Requiring Reorder</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Shortage</TableHead>
                <TableHead>Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-slate-500">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-emerald-600">
                    ✓ All items are above minimum stock
                  </TableCell>
                </TableRow>
              )}
              {data?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">
                    <Link to={`/items/${item.id}`} className="text-blue-600 hover:underline">
                      {item.sku}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-slate-600">{item.category_name ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">{item.warehouse_name ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono text-rose-600 font-semibold">
                    {int(item.stock)}
                  </TableCell>
                  <TableCell className="text-right font-mono">{int(item.min_stock)}</TableCell>
                  <TableCell className="text-right font-mono text-amber-600">
                    -{int(item.min_stock - item.stock)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{item.supplier || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}