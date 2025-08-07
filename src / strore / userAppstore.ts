import { create } from 'zustand';

interface AppState {
  user: string | null;
  role: 'freemium' | 'premium';
  setUser: (user: string) => void;
  setRole: (role: 'freemium' | 'premium') => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  role: 'freemium',
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
}));
