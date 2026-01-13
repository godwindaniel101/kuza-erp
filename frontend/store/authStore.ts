import { create } from 'zustand';
import { authService, User } from '@/lib/auth';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    restaurantName: string;
  }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false, // Start as false - Layout will handle initial check

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    if (user) {
      authService.setUser(user);
    }
  },

  setToken: (token) => {
    set({ token });
    if (token) {
      authService.setToken(token);
    }
  },

  login: async (email, password) => {
    const data = await authService.login(email, password);
    set({
      user: data.user,
      token: data.token,
      isAuthenticated: true,
      isLoading: false, // Ensure loading is false after login
    });
  },

  register: async (data) => {
    const result = await authService.register(data);
    set({
      user: result.user,
      token: result.token,
      isAuthenticated: true,
    });
  },

  logout: () => {
    authService.clearAuth();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  fetchUser: async () => {
    const state = get();
    // Prevent multiple simultaneous calls
    if (state.isLoading) {
      return Promise.resolve(); // Return resolved promise to prevent errors
    }
    set({ isLoading: true });
    const token = authService.getToken();
    if (token) {
      try {
        const user = await authService.fetchUser();
        set({
          user,
          token,
          isAuthenticated: !!user,
          isLoading: false,
        });
        return Promise.resolve();
      } catch (error) {
        // If fetch fails, clear auth state
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return Promise.reject(error);
      }
    } else {
      // No token - immediately set loading to false
      set({ isLoading: false, isAuthenticated: false });
      return Promise.resolve();
    }
  },

  hasPermission: (permission: string) => {
    return authService.hasPermission(permission);
  },

  hasAnyPermission: (permissions: string[]) => {
    return authService.hasAnyPermission(permissions);
  },
}));

