const BASE = import.meta.env.VITE_API_BASE ?? '';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiException extends Error {
  constructor(public status: number, public error: ApiError) {
    super(error.message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  if (res.status === 401 && !path.startsWith('/auth/')) {
    // Redirect to login on auth failure (except during login itself)
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const target = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${target}`;
    }
    throw new ApiException(401, { code: 'UNAUTHORIZED', message: 'Session expired' });
  }
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const errObj =
      typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? (parsed as { error: ApiError }).error
        : { code: 'HTTP_' + res.status, message: text || res.statusText };
    throw new ApiException(res.status, errObj);
  }
  return parsed as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function buildCsvUrl(path: string): string {
  return `${BASE}/api${path}`;
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const res = await fetch(`${BASE}/api${path}`, { credentials: 'include' });
  if (!res.ok) throw new ApiException(res.status, { code: 'HTTP_' + res.status, message: 'Download failed' });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}