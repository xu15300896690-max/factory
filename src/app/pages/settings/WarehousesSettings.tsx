import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api, ApiException } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';

interface Warehouse {
  id: number;
  name: string;
  location: string;
  capacity: number;
  item_count: number;
}

export default function WarehousesSettings() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get<{ warehouses: Warehouse[] }>('/warehouses').then((d) => d.warehouses),
  });
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Warehouses</h1>
          <p className="text-sm text-slate-500">{data?.length ?? 0} warehouses</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Warehouse
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Capacity</TableHead>
              <TableHead className="text-right">Items</TableHead>
              {isAdmin && <TableHead className="w-24"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.name}</TableCell>
                <TableCell>{w.location}</TableCell>
                <TableCell className="text-right font-mono">{w.capacity}</TableCell>
                <TableCell className="text-right font-mono text-slate-600">{w.item_count}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(w)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!confirm(`Delete ${w.name}?`)) return;
                          try {
                            await api.del(`/warehouses/${w.id}`);
                            qc.invalidateQueries({ queryKey: ['warehouses'] });
                            toast.success('Deleted');
                          } catch (err) {
                            const msg = err instanceof ApiException ? err.error.message : 'Failed';
                            toast.error(msg);
                          }
                        }}
                      >
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

      {(editing || creating) && (
        <WarehouseForm
          warehouse={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['warehouses'] });
          }}
        />
      )}
    </div>
  );
}

function WarehouseForm({
  warehouse,
  onClose,
}: {
  warehouse: Warehouse | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(warehouse?.name ?? '');
  const [location, setLocation] = useState(warehouse?.location ?? '');
  const [capacity, setCapacity] = useState(warehouse?.capacity ?? 0);
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      if (warehouse) {
        await api.patch(`/warehouses/${warehouse.id}`, { name, location, capacity });
        toast.success('Updated');
      } else {
        await api.post('/warehouses', { name, location, capacity });
        toast.success('Created');
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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{warehouse ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}