/**
 * End-to-end smoke test for the API. Run with `pnpm smoke`.
 * Assumes server is running on PORT (default 4000) and seeded.
 */
const BASE = `http://localhost:${process.env.PORT ?? 4000}/api`;

interface Cookie {
  name: string;
  value: string;
}

function parseSetCookies(headers: Headers): Cookie[] {
  // Node's Headers.getSetCookie is available in Node 20+
  const all = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  return all.map((c) => {
    const [pair] = c.split(';');
    const [name, value] = pair.split('=');
    return { name: name.trim(), value: value.trim() };
  });
}

class Session {
  cookie: string | null = null;

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.cookie) headers.set('cookie', this.cookie);
    if (init.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    const res = await fetch(`${BASE}${path}`, { ...init, headers });
    const set = parseSetCookies(res.headers);
    if (set.length) {
      this.cookie = set.map((c) => `${c.name}=${c.value}`).join('; ');
    }
    return res;
  }

  async json<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetch(path, init);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function main(): Promise<void> {
  console.log('1. Login admin...');
  const admin = new Session();
  await admin.json<{ user: { role: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  assert(admin.cookie, 'admin cookie set');

  console.log('2. /me...');
  const me = await admin.json<{ username: string }>('/auth/me');
  assert(me.username === 'admin', 'me.username=admin');

  console.log('3. Dashboard summary...');
  const summary = await admin.json<{ totalItems: number; pendingAudits: number }>('/dashboard/summary');
  assert(summary.totalItems > 0, 'has items');

  console.log('4. List items...');
  const items = await admin.json<{ items: unknown[]; total: number }>('/items?pageSize=5');
  assert(items.items.length > 0, 'items non-empty');

  console.log('5. Login operator + create outbound...');
  const op = new Session();
  await op.json('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'operator', password: 'operator123' }),
  });
  const first = (items.items[0] as { id: number; stock: number; name: string });
  await op.json('/audits', {
    method: 'POST',
    body: JSON.stringify({ type: 'outbound', item_id: first.id, quantity: 1 }),
  });

  console.log('6. Admin list pending...');
  const pending = await admin.json<{ audits: Array<{ id: number; item_id: number; status: string }> }>(
    '/audits?status=pending',
  );
  const myAudit = pending.audits.find((a) => a.item_id === first.id);
  assert(myAudit, 'pending audit found');

  console.log('7. Admin approve...');
  await admin.json(`/audits/${myAudit!.id}/approve`, { method: 'POST' });

  console.log('8. Operator cannot create items...');
  const denied = await op.fetch('/items', {
    method: 'POST',
    body: JSON.stringify({ sku: 'BAD-1', name: 'Bad' }),
  });
  assert(denied.status === 403, `operator create item got ${denied.status}`);

  console.log('9. Stock CSV export...');
  const csv = await admin.fetch('/reports/export.csv?type=stock');
  assert(csv.headers.get('content-type')?.includes('text/csv'), 'csv content-type');
  const body = await csv.text();
  assert(body.split('\n')[0]?.includes('sku'), 'csv has header');

  console.log('\n✓ All smoke checks passed.');
}

main().catch((err) => {
  console.error('Smoke FAILED:', err);
  process.exit(1);
});