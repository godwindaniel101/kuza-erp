import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Platform super-admin boundary.
 *
 * Allows a request through ONLY when its authenticated principal carries the
 * signed `isSuperAdmin === true` JWT claim (propagated onto request.user by
 * JwtStrategy). Anything else — a missing user, a normal tenant user, or a
 * client-forged flag — is rejected with 403.
 *
 * SECURITY: this is the sole server-side gate for every /admin route. It must
 * be combined with JwtAuthGuard (which authenticates and populates
 * request.user) and never relaxed to trust client input. It does not weaken or
 * replace TenantGuard/PermissionsGuard — those still run in the global chain.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) {
      // JwtAuthGuard should have populated this; a missing user means the
      // request is unauthenticated.
      throw new UnauthorizedException('Authentication required');
    }

    if (user.isSuperAdmin !== true) {
      throw new ForbiddenException('Super-admin access required');
    }

    return true;
  }
}
