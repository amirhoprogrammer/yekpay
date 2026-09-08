import { create } from "zustand";
import type { User } from "../types/auth";
import * as authApi from "../api/auth";
import { getApiError } from "../api/client";

const TOKEN_KEY = "flowpay_token";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  isLoading: false,

  setSession: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ user, token, isAuthenticated: true });
  },

  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { user, token } = await authApi.login({ email, password });
      get().setSession(user, token);
    } catch (err) {
      throw getApiError(err);
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (name, email, password, passwordConfirmation) => {
    set({ isLoading: true });
    try {
      const { user, token } = await authApi.register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      get().setSession(user, token);
    } catch (err) {
      throw getApiError(err);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      get().clearSession();
    }
  },

  hydrate: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await authApi.fetchMe();
      set({ user, token, isAuthenticated: true });
    } catch {
      get().clearSession();
    } finally {
      set({ isLoading: false });
    }
  },
}));
