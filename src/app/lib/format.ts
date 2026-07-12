import { formatDistanceToNowStrict } from 'date-fns';

export function fromNow(input: string | number | Date): string {
  const d = typeof input === 'string' ? new Date(input + (input.endsWith('Z') ? '' : 'Z')) : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function money(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function int(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'pending':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'rejected':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}