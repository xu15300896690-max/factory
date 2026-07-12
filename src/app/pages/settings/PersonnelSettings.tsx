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

interface Personnel {
  id: number;
  name: string;
  title: string;
  active: boolean;
}

export default function PersonnelSettings() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['personnel'],
    queryFn: () => api.get<{ personnel: Personnel[] }>('/personnel').then((d) => d.personnel),
  });
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personnel</h1>
          <p className="text-sm text-slate-500">{data?.length ?? 0} personnel</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Personnel
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-24"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.title}</TableCell>
                <TableCell>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                      p.active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(p)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!confirm(`Delete ${p.name}?`)) return;
                          try {
                            await api.del(`/personnel/${p.id}`);
                            qc.invalidateQueries({ queryKey: ['personnel'] });
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
        <PersonnelForm
          personnel={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['personnel'] });
          }}
        />
      )}
    </div>
  );
}

function PersonnelForm({
  personnel,
  onClose,
}: {
  personnel: Personnel | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(personnel?.name ?? '');
  const [title, setTitle] = useState(personnel?.title ?? 'Operator');
  const [active, setActive] = useState(personnel?.active ?? true);
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      if (personnel) {
        await api.patch(`/personnel/${personnel.id}`, { name, title, active });
        toast.success('Updated');
      } else {
        await api.post('/personnel', { name, title, active });
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
          <DialogTitle>{personnel ? 'Edit Personnel' : 'New Personnel'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="text-sm">Active</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}