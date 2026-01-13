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

    // Admin role has all permissions
    // Also check if user has no roles (temporary: allow access for users without roles during migration)
    if (!user.roles || user.roles.length === 0) {
      // For now, allow access if user has no roles (they're likely the owner)
      // TODO: Remove this after proper role assignment is implemented
      return true;
    }
    
    if (user.roles?.some((role: any) => role.name === 'admin')) {
      return true;
    }

    // Check if user has any of the required permissions
    const userPermissions = this.getUserPermissions(user);
    return requiredPermissions.some((permission) => userPermissions.includes(permission));
  }

  private getUserPermissions(user: any): string[] {
    const permissions: string[] = [];

    if (user.roles) {
      user.roles.forEach((role: any) => {
        if (role.permissions) {
          role.permissions.forEach((permission: any) => {
            if (!permissions.includes(permission.name)) {
              permissions.push(permission.name);
            }
          });
        }
      });
    }

    return permissions;
  }
}

