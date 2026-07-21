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
    businessName: string;
    businessType?: string;
    country?: string;
    enabledApps?: string[];
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
    const token = authService.getToken();
    if (!token) {
      // No token - immediately set loading to false
      set({ isLoading: false, isAuthenticated: false });
      return Promise.resolve();
    }
    set({ isLoading: true });
    // authService.fetchUser() returns null (and has already cleared the cookie)
    // only on a definitive 401/403. Transient failures throw — retry them so a
    // single flaky /auth/me on refresh doesn't bounce an authenticated user.
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const user = await authService.fetchUser();
        set({ user, token, isAuthenticated: !!user, isLoading: false });
        return Promise.resolve();
      } catch (error) {
        lastError = error;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    // Transient failures exhausted: leave the cookie/session intact so the next
    // navigation or refresh retries. Do NOT mark logged-out or clear the token.
    set({ isLoading: false });
    return Promise.reject(lastError);
  },

  hasPermission: (permission: string) => {
    return authService.hasPermission(permission);
  },

  hasAnyPermission: (permissions: string[]) => {
    return authService.hasAnyPermission(permissions);
  },
}));

