import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Normalize role names — request.user.roles may be an array of role
    // objects ({ name, permissions }) or already-flattened role-name strings.
    const roleNames = this.getRoleNames(user);

    // SECURITY: a user with no roles has no permissions. Deny access to any
    // permission-protected endpoint. (Owners are assigned the 'admin' role at
    // registration; see AuthService.register.) Previously this returned true,
    // which granted role-less accounts full access.
    if (roleNames.length === 0) {
      return false;
    }

    // Admin role short-circuits all permission checks.
    if (roleNames.includes('admin')) {
      return true;
    }

    // Check if user has any of the required permissions
    const userPermissions = this.getUserPermissions(user);
    return requiredPermissions.some((permission) => userPermissions.includes(permission));
  }

  private getRoleNames(user: any): string[] {
    if (!Array.isArray(user?.roles)) {
      return [];
    }
    return user.roles
      .map((role: any) => (typeof role === 'string' ? role : role?.name))
      .filter((name: any): name is string => Boolean(name));
  }

  /**
   * Collect permission names from either a flattened `permissions: string[]`
   * (as produced by AuthService.mapUser) or nested role.permissions objects.
   */
  private getUserPermissions(user: any): string[] {
    const permissions = new Set<string>();

    if (Array.isArray(user?.permissions)) {
      user.permissions.forEach((p: any) => {
        const name = typeof p === 'string' ? p : p?.name;
        if (name) permissions.add(name);
      });
    }

    if (Array.isArray(user?.roles)) {
      user.roles.forEach((role: any) => {
        if (role && Array.isArray(role.permissions)) {
          role.permissions.forEach((p: any) => {
            const name = typeof p === 'string' ? p : p?.name;
            if (name) permissions.add(name);
          });
        }
      });
    }

    return Array.from(permissions);
  }
}

