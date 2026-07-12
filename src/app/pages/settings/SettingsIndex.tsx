import { Link } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import {
  Building2,
  Tag,
  Users,
  Shield,
  Cog,
  ChevronRight,
} from 'lucide-react';

const SECTIONS = [
  {
    to: '/settings/warehouses',
    title: 'Warehouses',
    description: 'Manage warehouse locations and capacities.',
    icon: Building2,
  },
  {
    to: '/settings/categories',
    title: 'Categories',
    description: 'Configure inventory categories and colors.',
    icon: Tag,
  },
  {
    to: '/settings/personnel',
    title: 'Personnel',
    description: 'Track staff who handle inventory operations.',
    icon: Users,
  },
  {
    to: '/settings/system',
    title: 'System',
    description: 'Auto-approval limit, company info, and site settings.',
    icon: Cog,
  },
  {
    to: '/settings/users',
    title: 'Security & Access',
    description: 'Manage user accounts and roles.',
    icon: Shield,
  },
];

export default function SettingsIndex() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-500">Configure your factory inventory system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to}>
            <Card className="hover:shadow-md transition cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-slate-100 text-slate-700">
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-slate-500">{s.description}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}