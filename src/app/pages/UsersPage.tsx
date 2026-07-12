import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api, ApiException } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

interface UserRow {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'operator';
  active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ users: UserRow[] }>('/users').then((d) => d.users),
  });
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-slate-500">{data?.length ?? 0} users</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New User
        </Button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono">{u.username}</TableCell>
                <TableCell className="font-medium">{u.display_name}</TableCell>
                <TableCell>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                      u.role === 'admin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                      u.active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-500">{u.created_at}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(u)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={u.id === me?.id}
                      onClick={async () => {
                        if (!confirm(`Delete user ${u.username}?`)) return;
                        try {
                          await api.del(`/users/${u.id}`);
                          qc.invalidateQueries({ queryKey: ['users'] });
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(editing || creating) && (
        <UserForm
          user={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </div>
  );
}

function UserForm({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [role, setRole] = useState<'admin' | 'operator'>(user?.role ?? 'operator');
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      if (user) {
        const payload: Record<string, unknown> = { display_name: displayName, role, active };
        if (password) payload.password = password;
        await api.patch(`/users/${user.id}`, payload);
        toast.success('Updated');
      } else {
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setSaving(false);
          return;
        }
        await api.post('/users', {
          username,
          display_name: displayName,
          role,
          active,
          password,
        });
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
          <DialogTitle>{user ? 'Edit User' : 'New User'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!user && (
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{user ? 'New password (leave blank to keep)' : 'Password'}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
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