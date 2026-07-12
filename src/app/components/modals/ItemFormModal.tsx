import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api, ApiException } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface Item {
  id?: number;
  sku: string;
  barcode?: string | null;
  name: string;
  category_id?: number | null;
  warehouse_id?: number | null;
  location?: string;
  stock?: number;
  min_stock?: number;
  supplier?: string;
  unit_price?: number;
}

interface Props {
  item: Item | null;
  categories: Array<{ id: number; name: string }>;
  warehouses: Array<{ id: number; name: string }>;
  onClose: () => void;
}

export default function ItemFormModal({ item, categories, warehouses, onClose }: Props) {
  const [form, setForm] = useState<Item>(() =>
    item ?? {
      sku: '',
      name: '',
      barcode: '',
      location: '',
      stock: 0,
      min_stock: 0,
      supplier: '',
      unit_price: 0,
      category_id: null,
      warehouse_id: null,
    },
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) setForm(item);
  }, [item]);

  function set<K extends keyof Item>(key: K, value: Item[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(): Promise<void> {
    if (!form.sku || !form.name) {
      toast.error('SKU and Name are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
      };
      if (item?.id) {
        await api.patch(`/items/${item.id}`, payload);
        toast.success('Item updated');
      } else {
        await api.post('/items', payload);
        toast.success('Item created');
      }
      onClose();
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item?.id ? 'Edit Item' : 'New Item'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>SKU *</Label>
            <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} />
          </div>
          <div>
            <Label>Barcode</Label>
            <Input value={form.barcode ?? ''} onChange={(e) => set('barcode', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={form.category_id ? String(form.category_id) : 'none'}
              onValueChange={(v) => set('category_id', v === 'none' ? null : Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Warehouse</Label>
            <Select
              value={form.warehouse_id ? String(form.warehouse_id) : 'none'}
              onValueChange={(v) => set('warehouse_id', v === 'none' ? null : Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} />
          </div>
          <div>
            <Label>Supplier</Label>
            <Input value={form.supplier ?? ''} onChange={(e) => set('supplier', e.target.value)} />
          </div>
          {!item?.id && (
            <div>
              <Label>Initial Stock</Label>
              <Input
                type="number"
                min={0}
                value={form.stock ?? 0}
                onChange={(e) => set('stock', Number(e.target.value))}
              />
            </div>
          )}
          <div>
            <Label>Min Stock</Label>
            <Input
              type="number"
              min={0}
              value={form.min_stock ?? 0}
              onChange={(e) => set('min_stock', Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Unit Price</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={form.unit_price ?? 0}
              onChange={(e) => set('unit_price', Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}