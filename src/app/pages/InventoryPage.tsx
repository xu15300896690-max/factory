import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { api, ApiException } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { int } from '../lib/format';
import ItemFormModal from '../components/modals/ItemFormModal';

interface Item {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  category_name: string | null;
  warehouse_name: string | null;
  location: string;
  stock: number;
  min_stock: number;
  unit_price: number;
  supplier: string;
}

export default function InventoryPage() {
  const [params, setParams] = useSearchParams();
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const q = params.get('q') ?? '';
  const categoryId = params.get('categoryId') ?? '';
  const warehouseId = params.get('warehouseId') ?? '';
  const lowStock = params.get('lowStock') === '1';
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: Array<{ id: number; name: string }> }>('/categories').then((d) => d.categories),
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () =>
      api
        .get<{ warehouses: Array<{ id: number; name: string }> }>('/warehouses')
        .then((d) => d.warehouses),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['items', { q, categoryId, warehouseId, lowStock, page }],
    queryFn: () =>
      api
        .get<{ items: Item[]; total: number }>(
          `/items?q=${encodeURIComponent(q)}&categoryId=${categoryId}&warehouseId=${warehouseId}&lowStock=${
            lowStock ? 1 : 0
          }&page=${page}&pageSize=20`,
        ),
  });

  function update(key: string, value: string): void {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
    setPage(1);
  }

  async function deleteItem(item: Item): Promise<void> {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.del(`/items/${item.id}`);
      toast.success('Item deleted');
      // invalidate
      window.location.reload();
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : 'Failed to delete';
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} items</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search SKU, name, or barcode..."
            value={q}
            onChange={(e) => update('q', e.target.value)}
          />
        </div>
        <Select value={categoryId || 'all'} onValueChange={(v) => update('categoryId', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={warehouseId || 'all'} onValueChange={(v) => update('warehouseId', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={lowStock ? 'default' : 'outline'} onClick={() => update('lowStock', lowStock ? '' : '1')}>
          {lowStock ? 'Showing low only' : 'Low stock only'}
        </Button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">Price</TableHead>
              {isAdmin && <TableHead className="w-24"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No items found
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((item) => (
              <TableRow key={item.id} className="hover:bg-slate-50">
                <TableCell className="font-mono text-xs">
                  <Link to={`/items/${item.id}`} className="text-blue-600 hover:underline">
                    {item.sku}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link to={`/items/${item.id}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                  {item.stock <= item.min_stock && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      LOW
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-slate-600">{item.category_name ?? '—'}</TableCell>
                <TableCell className="text-slate-600">{item.warehouse_name ?? '—'}</TableCell>
                <TableCell className="text-right font-mono">{int(item.stock)}</TableCell>
                <TableCell className="text-right font-mono text-slate-500">{int(item.min_stock)}</TableCell>
                <TableCell className="text-right font-mono">${item.unit_price.toFixed(2)}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(item)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem(item)}>
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="px-3 py-2 text-sm text-slate-600">
            Page {page} of {Math.ceil(data.total / 20)}
          </span>
          <Button
            variant="outline"
            disabled={page * 20 >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {(editing || creating) && (
        <ItemFormModal
          item={editing}
          categories={categories}
          warehouses={warehouses}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}