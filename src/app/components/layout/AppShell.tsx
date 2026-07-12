import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Toaster } from 'sonner';
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  AlertTriangle,
  BarChart3,
  Settings,
  Users,
  LogOut,
  Bell,
  Search,
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/audits', label: 'Audits', icon: ClipboardList },
  { to: '/low-stock', label: 'Low Stock', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Set document title based on route
    const segs = location.pathname.split('/').filter(Boolean);
    const name = segs[0] ? segs[0].replace('-', ' ') : 'Dashboard';
    document.title = `${name.charAt(0).toUpperCase() + name.slice(1)} · Factory Admin`;
  }, [location.pathname]);

  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    setUser(null);
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-500 grid place-items-center text-white font-bold">
              F
            </div>
            <div>
              <div className="font-semibold text-sm">Factory Inventory</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Admin Console
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Users className="w-4 h-4" />
              Users
            </NavLink>
          )}
        </nav>
        <div className="px-3 py-3 border-t border-slate-800">
          <div className="px-3 py-2 mb-2">
            <div className="text-xs font-medium">{user?.display_name ?? '—'}</div>
            <div className="text-[10px] text-slate-400 capitalize">{user?.role}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search inventory..."
              className="pl-9 h-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) navigate(`/inventory?q=${encodeURIComponent(v)}`);
                }
              }}
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              className="w-9 h-9 grid place-items-center rounded hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-500" />
            </button>
            <div className="text-sm text-slate-600">
              {user?.display_name}
              <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-700 uppercase tracking-wide">
                {user?.role}
              </span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}