import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiException } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';

export default function SystemSettingsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Record<string, string>>('/settings'),
  });
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await api.patch('/settings', form);
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['settings'] });
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">System Settings</h1>
        <p className="text-sm text-slate-500">Configure system-wide behavior.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval & Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Auto-approval limit (admin inbound)</Label>
            <Input
              type="number"
              min={0}
              value={form.autoApprovalLimit ?? '50'}
              onChange={(e) => setForm((f) => ({ ...f, autoApprovalLimit: e.target.value }))}
              disabled={!isAdmin}
            />
            <p className="text-xs text-slate-500 mt-1">
              Inbound operations by admins with quantity at or below this limit are auto-approved.
            </p>
          </div>
          <div>
            <Label>Low stock threshold multiplier</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              value={form.lowStockThreshold ?? '1.0'}
              onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
              disabled={!isAdmin}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Company Name</Label>
            <Input
              value={form.companyName ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <Label>Site Name</Label>
            <Input
              value={form.siteName ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, siteName: e.target.value }))}
              disabled={!isAdmin}
            />
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      )}
    </div>
  );
}