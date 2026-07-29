import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { BillingService } from '../billing.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Post-trial read-only lock. When a tenant's free trial has elapsed with no
 * active PAID subscription (BillingService.isReadOnly), all WRITE requests are
 * blocked until they pay — but READS stay available so they never lose sight of
 * their data. Free = the trial window only (founder direction); there is no
 * permanent free tier.
 *
 * Money-path safety:
 *  - FAILS OPEN — any error resolving the read-only state allows the write, so
 *    a bug here can never lock every tenant out.
 *  - The payment (/billing) and auth (/auth) paths always pass, so a locked
 *    tenant can always reach checkout to recover.
 *  - Reads (GET/HEAD/OPTIONS), @Public routes, and platform super-admins are
 *    never gated.
 *
 * Registered as a global guard AFTER TenantGuard (needs request.user), so it
 * applies everywhere without per-controller wiring.
 */
@Injectable()
export class TrialLockGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const method: string = (req?.method || 'GET').toUpperCase();
    if (!MUTATING.has(method)) {
      return true; // reads always pass
    }

    // Never trap platform super-admins (they act cross-tenant).
    if (req?.user?.isSuperAdmin === true) {
      return true;
    }

    // Keep the recovery paths open: billing (checkout/upgrade) and auth.
    const path: string = req?.path || req?.originalUrl || req?.url || '';
    if (path.includes('/billing') || path.includes('/auth')) {
      return true;
    }

    const tenantId: string | undefined = req?.user?.tenantId;
    if (!tenantId) {
      return true; // no tenant context (e.g. onboarding) — other guards handle it
    }

    try {
      const readOnly = await this.billingService.isReadOnly(tenantId);
      if (readOnly) {
        throw new ForbiddenException({
          success: false,
          message:
            'Your free trial has ended. Subscribe to continue — you can still view your data, but changes are paused until you pay.',
          code: 'TRIAL_ENDED',
        });
      }
    } catch (err) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      // Fail open on any unexpected error — never block writes due to a bug.
      return true;
    }

    return true;
  }
}
