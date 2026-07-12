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

interface Category {
  id: number;
  name: string;
  color: string;
  item_count: number;
}

export default function CategoriesSettings() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: Category[] }>('/categories').then((d) => d.categories),
  });
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-slate-500">{data?.length ?? 0} categories</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Category
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Items</TableHead>
              {isAdmin && <TableHead className="w-24"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <span
                    className="block w-5 h-5 rounded"
                    style={{ background: c.color }}
                  />
                </TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right font-mono">{c.item_count}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(c)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!confirm(`Delete ${c.name}?`)) return;
                          try {
                            await api.del(`/categories/${c.id}`);
                            qc.invalidateQueries({ queryKey: ['categories'] });
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
        <CategoryForm
          category={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['categories'] });
          }}
        />
      )}
    </div>
  );
}

function CategoryForm({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? '#3b82f6');
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      if (category) {
        await api.patch(`/categories/${category.id}`, { name, color });
        toast.success('Updated');
      } else {
        await api.post('/categories', { name, color });
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
          <DialogTitle>{category ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 rounded border cursor-pointer"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
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