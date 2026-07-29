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
 * Gate a controller (or handler) behind one OR MORE apps from the canonical
 * registry (common/apps/app-registry.ts), e.g.:
 *
 *   @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
 *   @RequireApp('books')            // single app
 *   @RequireApp('items', 'rms')     // any-of: shared stock core — either vertical
 *
 * With several keys the check is ANY-OF: the handler passes if the tenant has
 * at least one of them effective. This is how the shared stock core is exposed
 * to both the Inventory (items) and Restaurant (rms) verticals without coupling
 * them (stock is a reusable core owned by no app).
 *
 * The keys are checked against the tenant's EFFECTIVE apps:
 * (Business.enabledApps ?? legacy-all) ∩ apps allowed by the plan — see
 * BillingService.getEffectiveApps. TRIALING subscriptions pass the plan side
 * entirely but still respect the business's own enabledApps.
 */
export const RequireApp = (...appKeys: (AppKey | string)[]) =>
  SetMetadata(REQUIRE_MODULE_KEY, appKeys);

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
    // Metadata is an array of keys (RequireApp is variadic). Tolerate a bare
    // string from any legacy call site.
    const meta = this.reflector.getAllAndOverride<string | string[]>(
      REQUIRE_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredKeys = Array.isArray(meta) ? meta : meta ? [meta] : [];
    if (requiredKeys.length === 0) {
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

    // Expand each key: canonical → itself; legacy plan-module key → its apps.
    // The union is checked ANY-OF (having one required app is enough).
    const requiredApps: string[] = requiredKeys.flatMap((key) =>
      (APP_KEYS as string[]).includes(key)
        ? [key]
        : (LEGACY_PLAN_MODULE_TO_APPS[key] ?? [key]),
    );

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
