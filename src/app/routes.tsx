import { redirect, type LoaderFunctionArgs } from 'react-router';
import { api, ApiException } from './lib/api';
import { useAuthStore } from './lib/auth-store';
import type { CurrentUser } from './lib/auth-store';

export async function requireAuth(_args: LoaderFunctionArgs): Promise<CurrentUser> {
  try {
    const user = await api.get<CurrentUser>('/auth/me');
    useAuthStore.getState().setUser(user);
    return user;
  } catch (err) {
    if (err instanceof ApiException && err.status === 401) {
      throw redirect('/login');
    }
    throw err;
  }
}

export function requireRole(role: 'admin' | 'operator') {
  return async (_args: LoaderFunctionArgs): Promise<CurrentUser> => {
    const user = await requireAuth(_args);
    if (user.role !== role) {
      throw redirect('/');
    }
    return user;
  };
}