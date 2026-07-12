import { useParams, Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer } from 'lucide-react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { int, money } from '../lib/format';

interface ItemDetail {
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
  last_updated: string;
  created_at: string;
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: item, isLoading } = useQuery({
    queryKey: ['items', Number(id)],
    queryFn: () => api.get<ItemDetail>(`/items/${id}`),
    enabled: Boolean(id),
  });

  if (isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!item) return <div className="text-slate-500">Item not found</div>;

  function printLabel(): void {
    window.print();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{item.name}</h1>
          <p className="text-sm text-slate-500 font-mono">{item.sku}</p>
        </div>
        <Button variant="outline" onClick={printLabel}>
          <Printer className="w-4 h-4 mr-2" />
          Print Label
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Category</dt>
                <dd className="font-medium">{item.category_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Warehouse</dt>
                <dd className="font-medium">{item.warehouse_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Location</dt>
                <dd className="font-medium">{item.location || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Supplier</dt>
                <dd className="font-medium">{item.supplier || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Barcode</dt>
                <dd className="font-medium font-mono">{item.barcode ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Last updated</dt>
                <dd className="font-medium">{item.last_updated}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-500 text-sm">On hand</span>
              <span className="text-3xl font-bold">{int(item.stock)}</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-500">Minimum</span>
              <span className="font-mono">{int(item.min_stock)}</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-500">Unit price</span>
              <span className="font-mono">{money(item.unit_price)}</span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500 text-sm">Value</span>
                <span className="font-semibold">{money(item.stock * item.unit_price)}</span>
              </div>
            </div>
            {item.stock <= item.min_stock && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded">
                ⚠ Below minimum stock
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 print:block">
          <CardHeader className="print:hidden">
            <CardTitle>QR Label</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center bg-white print:bg-white">
            <div className="border-2 border-slate-900 p-4 inline-flex flex-col items-center gap-2">
              <QRCodeSVG value={`app://item/${item.id}`} size={180} level="M" />
              <div className="text-center">
                <div className="font-bold">{item.name}</div>
                <div className="text-xs font-mono">{item.sku}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}