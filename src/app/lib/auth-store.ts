import { create } from 'zustand';

export type Role = 'admin' | 'operator';

export interface CurrentUser {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  active: boolean;
  created_at?: string;
}

interface AuthState {
  user: CurrentUser | null;
  setUser: (user: CurrentUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export function isAdmin(role: Role | undefined): boolean {
  return role === 'admin';
}