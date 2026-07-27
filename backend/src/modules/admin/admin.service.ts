import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { LandlordService } from '../../common/landlord/services/landlord.service';
import {
  BillingService,
  CreatePlanInput,
  UpdatePlanInput,
} from '../billing/billing.service';
import { AccessRequestStatus } from '../billing/entities/app-access-request.entity';

/**
 * Platform super-admin back-office. Cross-tenant orchestration ONLY — every
 * mutation is delegated to the existing tenant-scoped BillingService methods,
 * parameterized by the target tenantId + its schemaName (resolved from the
 * landlord Tenant record). No tenant business logic is re-implemented here, and
 * cross-tenant writes always pass an explicit schema (never rely on the
 * request's pinned search_path), so tenant isolation is preserved.
 *
 * Authorization is enforced by SuperAdminGuard on the controller — this service
 * assumes the caller is already a verified super-admin.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly landlordService: LandlordService,
    private readonly billingService: BillingService,
  ) {}

  /**
   * List every active tenant with its plan, subscription status and enabled-app
   * count. Per-tenant billing enrichment is defensive: a single tenant in a
   * broken state (e.g. no business row yet) must not fail the whole list.
   */
  async listTenants() {
    const tenants = await this.landlordService.getAllTenants();

    return Promise.all(
      tenants.map(async (tenant) => {
        let plan: { code: string; name: string } | null = null;
        let subscriptionStatus: string | null = null;
        let enabledAppCount: number | null = null;

        try {
          const subscription = await this.billingService.getOrCreateSubscription(
            tenant.id,
          );
          subscriptionStatus = subscription.status;
          if (subscription.plan) {
            plan = {
              code: subscription.plan.code,
              name: subscription.plan.name,
            };
          }
        } catch (error) {
          this.logger.warn(
            `Could not resolve subscription for tenant ${tenant.id}: ${(error as Error).message}`,
          );
        }

        try {
          const overview = await this.billingService.getAppsOverview(
            tenant.id,
            tenant.schemaName,
          );
          enabledAppCount = overview.apps.filter((app) => app.enabled).length;
        } catch (error) {
          this.logger.warn(
            `Could not resolve apps for tenant ${tenant.id}: ${(error as Error).message}`,
          );
        }

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          schemaName: tenant.schemaName,
          plan,
          subscriptionStatus,
          enabledAppCount,
          createdAt: tenant.createdAt,
        };
      }),
    );
  }

  /** Full detail for one tenant: apps, plan/subscription, pending requests. */
  async getTenantDetail(tenantId: string) {
    // Throws 404 if the tenant does not exist.
    const tenant = await this.landlordService.findTenantById(tenantId);

    const [overview, subscription, pendingAccessRequests] = await Promise.all([
      this.billingService.getAppsOverview(tenant.id, tenant.schemaName),
      this.billingService.getOrCreateSubscription(tenant.id),
      this.billingService.listAccessRequests(tenant.id, 'PENDING'),
    ]);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      schemaName: tenant.schemaName,
      businessType: overview.businessType,
      apps: overview.apps,
      enabledApps: overview.apps
        .filter((app) => app.enabled)
        .map((app) => app.key),
      effectiveApps: overview.effective,
      plan: subscription.plan
        ? {
            code: subscription.plan.code,
            name: subscription.plan.name,
            monthlyPriceUsd: Number(subscription.plan.monthlyPriceUsd),
            limits: subscription.plan.limits,
          }
        : null,
      subscriptionStatus: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      pendingAccessRequests,
    };
  }

  /**
   * Enable/disable an app for a tenant, reusing BillingService.setAppEnabled.
   * Plan-locked apps are NOT silently enabled: setAppEnabled throws
   * ForbiddenException, which we translate into a { needsUpgrade } response so
   * the admin can decide to change the plan first.
   */
  async setTenantApp(tenantId: string, appKey: string, enabled: boolean) {
    const tenant = await this.landlordService.findTenantById(tenantId);
    try {
      const data = await this.billingService.setAppEnabled(
        tenant.id,
        tenant.schemaName,
        appKey,
        enabled,
      );
      return { ...data, needsUpgrade: false };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return { needsUpgrade: true, message: error.message };
      }
      throw error;
    }
  }

  /**
   * Change a tenant's plan (super-admin only — controller is SuperAdminGuard-
   * gated). allowPaid: a super-admin may assign a paid plan directly (manual
   * billing / comping), unlike the tenant's own self-service switch.
   */
  async changeTenantPlan(tenantId: string, planCode: string) {
    const tenant = await this.landlordService.findTenantById(tenantId);
    return this.billingService.changePlan(tenant.id, planCode, { allowPaid: true });
  }

  /**
   * All access requests across tenants, optionally filtered by status, enriched
   * with the owning tenant's name/slug for display.
   */
  async listAccessRequests(status?: AccessRequestStatus) {
    const [requests, tenants] = await Promise.all([
      this.billingService.listAllAccessRequests(status),
      this.landlordService.getAllTenants(),
    ]);
    const byId = new Map(tenants.map((tenant) => [tenant.id, tenant]));

    return requests.map((request) => {
      const tenant = byId.get(request.tenantId);
      return {
        ...request,
        tenantName: tenant?.name ?? null,
        tenantSlug: tenant?.slug ?? null,
      };
    });
  }

  /**
   * Approve a cross-tenant access request: resolve its owning tenant, then
   * reuse the tenant-scoped approve logic (which respects the plan and returns
   * needsUpgrade instead of enabling a plan-locked app).
   */
  async approveAccessRequest(id: string, adminUser: { sub?: string }) {
    const request = await this.billingService.getAccessRequestById(id);
    const tenant = await this.landlordService.findTenantById(request.tenantId);
    return this.billingService.approveAccessRequest(
      tenant.id,
      tenant.schemaName,
      id,
      adminUser,
    );
  }

  /** Reject a cross-tenant access request, reusing tenant-scoped logic. */
  async rejectAccessRequest(id: string, adminUser: { sub?: string }) {
    const request = await this.billingService.getAccessRequestById(id);
    const tenant = await this.landlordService.findTenantById(request.tenantId);
    return this.billingService.rejectAccessRequest(tenant.id, id, adminUser);
  }

  /** Read-only plan catalog. */
  async listPlans() {
    return this.billingService.getPlanCatalog();
  }

  /** Create a new plan (delegates to BillingService, which validates modules). */
  async createPlan(input: CreatePlanInput) {
    return this.billingService.createPlan(input);
  }

  /** Update an existing plan by code. */
  async updatePlan(code: string, input: UpdatePlanInput) {
    return this.billingService.updatePlan(code, input);
  }

  /** Soft-delete (deactivate) a plan by code — never breaks existing tenants. */
  async deactivatePlan(code: string) {
    return this.billingService.deactivatePlan(code);
  }
}
