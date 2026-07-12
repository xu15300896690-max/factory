import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Check, X, Filter } from 'lucide-react';
import { api, ApiException } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { fromNow, int, statusBadgeClass } from '../lib/format';

interface Audit {
  id: number;
  type: 'inbound' | 'outbound';
  item_id: number;
  item_name?: string;
  item_sku?: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  operator_name?: string;
  reviewer_name?: string;
  personnel_name?: string;
  source: 'web' | 'android' | 'api';
  note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

export default function AuditsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const type = params.get('type') ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['audits', { status, type }],
    queryFn: () =>
      api
        .get<{ audits: Audit[]; total: number }>(
          `/audits?status=${status}&type=${type}&pageSize=50`,
        ),
  });

  async function approve(id: number): Promise<void> {
    try {
      await api.post(`/audits/${id}/approve`);
      toast.success('Audit approved and stock updated');
      qc.invalidateQueries({ queryKey: ['audits'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : 'Failed to approve';
      toast.error(msg);
    }
  }
  async function reject(id: number): Promise<void> {
    if (!confirm('Reject this audit?')) return;
    try {
      await api.post(`/audits/${id}/reject`);
      toast.success('Audit rejected');
      qc.invalidateQueries({ queryKey: ['audits'] });
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : 'Failed to reject';
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} records</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select value={status || 'all'} onValueChange={(v) => {
          const next = new URLSearchParams(params);
          if (v === 'all') next.delete('status'); else next.set('status', v);
          setParams(next);
        }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type || 'all'} onValueChange={(v) => {
          const next = new URLSearchParams(params);
          if (v === 'all') next.delete('type'); else next.set('type', v);
          setParams(next);
        }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-32"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-500">Loading…</TableCell>
              </TableRow>
            )}
            {!isLoading && data?.audits.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-500">No audits</TableCell>
              </TableRow>
            )}
            {data?.audits.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs text-slate-600" title={a.created_at}>
                  {fromNow(a.created_at)}
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs uppercase font-semibold ${
                      a.type === 'inbound' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {a.type === 'inbound' ? '↓ IN' : '↑ OUT'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{a.item_name ?? `Item #${a.item_id}`}</div>
                  <div className="text-xs text-slate-500 font-mono">{a.item_sku}</div>
                </TableCell>
                <TableCell className="text-right font-mono">{int(a.quantity)}</TableCell>
                <TableCell className="text-sm">{a.operator_name ?? '—'}</TableCell>
                <TableCell>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {a.source}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${statusBadgeClass(
                      a.status,
                    )}`}
                  >
                    {a.status}
                  </span>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    {a.status === 'pending' ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => approve(a.id)}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => reject(a.id)}>
                          <X className="w-3 h-3 text-rose-600" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {a.reviewer_name && `by ${a.reviewer_name}`}
                      </span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}