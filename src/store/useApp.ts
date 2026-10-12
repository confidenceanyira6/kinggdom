import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

type Theme = 'dark' | 'light';

interface AppState {
  user: User | null;
  tokens: number;
  theme: Theme;
  toastMsg: string | null;
  setUser: (u: User | null) => void;
  setTokens: (n: number) => void;
  setTheme: (t: Theme) => void;
  toast: (m: string) => void;
  signOut: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      tokens: 0,
      theme: 'dark',
      toastMsg: null,
      setUser: (user) => set({ user }),
      setTokens: (tokens) => set({ tokens }),
      setTheme: (theme) => set({ theme }),
      toast: (m) => {
        set({ toastMsg: m });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => set({ toastMsg: null }), 2200);
      },
      signOut: () => set({ user: null, tokens: 0 }),
    }),
    { name: 'kinggdom-app', partialize: (s) => ({ user: s.user, tokens: s.tokens, theme: s.theme }) }
  )
);
