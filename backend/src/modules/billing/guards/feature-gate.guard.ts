import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AppKey,
  APP_KEYS,
  getApp,
  LEGACY_PLAN_MODULE_TO_APPS,
} from '../../../common/apps/app-registry';
import { BillingService } from '../billing.service';

export const REQUIRE_MODULE_KEY = 'require_module';

/**
 * Gate a controller (or handler) behind an app from the canonical registry
 * (common/apps/app-registry.ts), e.g.:
 *
 *   @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
 *   @RequireApp('books')
 *
 * The guard checks the key against the tenant's EFFECTIVE apps:
 * (Business.enabledApps ?? legacy-all) ∩ apps allowed by the plan — see
 * BillingService.getEffectiveApps. TRIALING subscriptions pass the plan side
 * entirely but still respect the business's own enabledApps.
 */
export const RequireApp = (appKey: AppKey | string) =>
  SetMetadata(REQUIRE_MODULE_KEY, appKey);

/**
 * @deprecated Backward-compatible alias for pre-apps-model call sites.
 * Legacy plan module keys ('ims', 'rms', ...) are mapped to their canonical
 * apps at check time (any-of passes).
 */
export const RequireModule = RequireApp;

@Injectable()
export class FeatureGateGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredKey = this.reflector.getAllAndOverride<string>(
      REQUIRE_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined = request?.user?.tenantId;
    // TenantGuard (global) attaches request.tenant before controller-level
    // guards run; the JWT strategy also carries the tenant on request.user.
    const schemaName: string | undefined =
      request?.tenant?.schemaName ?? request?.user?.tenant?.schemaName;
    if (!tenantId || !schemaName) {
      return false;
    }

    // Canonical key → itself; legacy plan-module key → its apps (any-of).
    const requiredApps: string[] = (APP_KEYS as string[]).includes(requiredKey)
      ? [requiredKey]
      : (LEGACY_PLAN_MODULE_TO_APPS[requiredKey] ?? [requiredKey]);

    const effective: string[] = await this.billingService.getEffectiveApps(
      tenantId,
      schemaName,
    );
    if (requiredApps.some((key) => effective.includes(key))) {
      return true;
    }

    const appKey = requiredApps[0];
    const appName = getApp(appKey)?.name ?? appKey;
    throw new ForbiddenException({
      success: false,
      message: `The ${appName} app is not enabled for your business`,
      appKey,
      enableHint: `Ask an admin to enable it under Settings → Apps (PATCH /api/billing/apps with { "key": "${appKey}", "enabled": true }); if it is locked by your plan, upgrade first.`,
    });
  }
}
