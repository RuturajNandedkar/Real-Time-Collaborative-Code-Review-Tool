import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import { initSocket, disconnectSocket } from '../lib/socket';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      // ─── Register ──────────────────────────────────────────────────────
      register: async ({ username, email, password }) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', { username, email, password });
          const { user, token } = data.data;

          localStorage.setItem('ccr_token', token);
          initSocket(token);

          set({ user, token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      // ─── Login ─────────────────────────────────────────────────────────
      login: async ({ email, password }) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { user, token } = data.data;

          localStorage.setItem('ccr_token', token);
          initSocket(token);

          set({ user, token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      // ─── Logout ────────────────────────────────────────────────────────
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (_) {
          // Ignore errors on logout
        } finally {
          localStorage.removeItem('ccr_token');
          disconnectSocket();
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      // ─── Restore session ───────────────────────────────────────────────
      restoreSession: async () => {
        const token = localStorage.getItem('ccr_token');
        if (!token) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const { data } = await api.get('/auth/me');
          initSocket(token);
          set({ user: data.data.user, token, isAuthenticated: true, isLoading: false });
        } catch (_) {
          localStorage.removeItem('ccr_token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'ccr_auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

export default useAuthStore;
