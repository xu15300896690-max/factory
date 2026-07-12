export function nowIso(): string {
  return new Date().toISOString();
}

export function formatRelative(iso: string): string {
  const t = new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).getTime();
  if (!Number.isFinite(t)) return iso;
  const diffMs = Date.now() - t;
  const s = Math.round(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}