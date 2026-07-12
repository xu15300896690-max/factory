import { useState } from 'react';
import { useNavigate, useSearchParams, redirect } from 'react-router';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api, ApiException } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export async function loginLoader(): Promise<Response | null> {
  try {
    await api.get('/auth/me');
    return redirect('/');
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await api.post<{ user: ReturnType<typeof useAuthStore.getState>['user'] }>(
        '/auth/login',
        { username, password },
      );
      setUser(user);
      toast.success(`Welcome, ${user?.display_name}`);
      navigate(params.get('next') ?? '/', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded bg-blue-600 grid place-items-center text-white font-bold">
            F
          </div>
          <div>
            <h1 className="text-lg font-semibold">Factory Inventory</h1>
            <p className="text-xs text-slate-500">Admin Console</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sign in
          </Button>
        </form>
        <div className="mt-6 text-[11px] text-slate-500 text-center">
          Default accounts: <code>admin/admin123</code> · <code>operator/operator123</code>
        </div>
      </div>
    </div>
  );
}