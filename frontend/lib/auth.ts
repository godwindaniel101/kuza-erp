import Cookies from 'js-cookie';
import { api } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  businessId: string;
  permissions: string[];
  roles: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';
  // Normalize a backend user payload to the frontend User shape
  private normalizeUser(user: any): User {
    if (!user) return user as User;
    const roles = Array.isArray(user.roles)
      ? (typeof user.roles[0] === 'string'
          ? user.roles
          : (user.roles || []).map((r: any) => r?.name).filter(Boolean))
      : [];
    let permissions: string[] = [];
    if (Array.isArray(user.permissions)) {
      permissions = (typeof user.permissions[0] === 'string')
        ? user.permissions as string[]
        : (user.permissions || []).map((p: any) => p?.name).filter(Boolean);
    } else if (Array.isArray(user.roles)) {
      permissions = Array.from(new Set((user.roles || []).flatMap((r: any) => (r?.permissions || []).map((p: any) => p?.name)))).filter(Boolean) as string[];
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      businessId: user.businessId || user.restaurant?.id || '',
      roles,
      permissions,
    } as User;
  }

  setToken(token: string) {
    Cookies.set(this.tokenKey, token, { expires: 7 });
  }

  getToken(): string | null {
    return Cookies.get(this.tokenKey) || null;
  }

  setUser(user: User) {
    Cookies.set(this.userKey, JSON.stringify(user), { expires: 7 });
  }

  getUser(): User | null {
    const userStr = Cookies.get(this.userKey);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  clearAuth() {
    Cookies.remove(this.tokenKey);
    Cookies.remove(this.userKey);
  }

  async login(email: string, password: string) {
    try {
      const response = await api.post<{ success: boolean; data: { user: User; token: string } }>(
        '/auth/login',
        { email, password },
      );
      
      if (response.success && response.data) {
        this.setToken(response.data.token);
        // Normalize roles/permissions in case backend returns relational data
        const normalizedUser = this.normalizeUser(response.data.user as any);
        this.setUser(normalizedUser as User);
        return { ...response.data, user: normalizedUser as User };
      }
      throw new Error('Login failed');
    } catch (error: any) {
      // Re-throw with original error message
      throw error;
    }
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    restaurantName: string;
  }) {
    try {
      const response = await api.post<{ success: boolean; data: { user: User; token: string } }>(
        '/auth/register',
        data,
      );
      
      if (response.success && response.data) {
        this.setToken(response.data.token);
        const normalizedUser = this.normalizeUser(response.data.user as any);
        this.setUser(normalizedUser as User);
        return { ...response.data, user: normalizedUser as User };
      }
      throw new Error('Registration failed');
    } catch (error: any) {
      // Re-throw with original error message
      throw error;
    }
  }

  async fetchUser(): Promise<User | null> {
    try {
      const response = await api.get<{ success: boolean; data: User }>('/auth/me');
      if (response.success && response.data) {
        const normalizedUser = this.normalizeUser(response.data as any);
        this.setUser(normalizedUser as User);
        return normalizedUser as User;
      }
    } catch (error) {
      this.clearAuth();
    }
    return null;
  }

  hasPermission(permission: string): boolean {
    const user = this.getUser();
    if (!user) return false;
    // Admin has all permissions
    if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) return true;
    // Check if user has the specific permission
    return user.permissions?.includes(permission) || false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    const user = this.getUser();
    if (!user) return false;
    // Admin has all permissions
    if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) return true;
    // Check if user has any of the permissions
    return permissions.some((perm) => user.permissions?.includes(perm));
  }
}

export const authService = new AuthService();

// Extend the class prototype with a private helper without changing exports
(AuthService.prototype as any).normalizeUser = function(user: any): User {
  if (!user) return user;
  const roles = Array.isArray(user.roles)
    ? (typeof user.roles[0] === 'string'
        ? user.roles
        : (user.roles || []).map((r: any) => r?.name).filter(Boolean))
    : [];
  let permissions: string[] = [];
  if (Array.isArray(user.permissions)) {
    permissions = (typeof user.permissions[0] === 'string')
      ? user.permissions as string[]
      : (user.permissions || []).map((p: any) => p?.name).filter(Boolean);
  } else if (Array.isArray(user.roles)) {
    permissions = Array.from(new Set((user.roles || []).flatMap((r: any) => (r?.permissions || []).map((p: any) => p?.name)))).filter(Boolean) as string[];
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    firstName: user.firstName,
    lastName: user.lastName,
    businessId: user.businessId || user.restaurant?.id || '',
    roles,
    permissions,
  } as User;
};