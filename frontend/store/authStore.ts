/**
 * Authentication state management with Zustand.
 */

import { create } from 'zustand';
import { authAPI } from '@/lib/api';
import { getAuthToken, removeAuthToken, setAuthToken } from '@/lib/authToken';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const tokenData = await authAPI.login(email, password);
      setAuthToken(tokenData.access_token);

      const user = await authAPI.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: () => {
    removeAuthToken();
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const user = await authAPI.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch user:', error);
      removeAuthToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
