import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  APP_KEYS,
  APP_REGISTRY,
  AppKey,
  appsForPlanModules,
  dependentsOf,
  expandDependencies,
  getApp,
} from '../../common/apps/app-registry';
import { Plan, PlanCode, PlanLimits } from './entities/plan.entity';
import {
  TenantSubscription,
} from './entities/tenant-subscription.entity';
import { User } from '../../common/entities/user.entity';
import { Branch } from '../../common/entities/branch.entity';
import { InventoryItem } from '../ims/entities/inventory-item.entity';

const TRIAL_DAYS = 14;

const PLAN_SEED: Array<{
  code: PlanCode;
  name: string;
  monthlyPriceUsd: number;
  prices: Record<string, number>;
  description: string;
  limits: PlanLimits;
}> = [
  {
    code: 'FREE',
    name: 'Free',
    monthlyPriceUsd: 0,
    prices: { NGN: 0, GHS: 0, KES: 0, XOF: 0, USD: 0, GBP: 0, EUR: 0 },
    description: 'Get started with core inventory and restaurant management.',
    limits: { maxUsers: 3, maxBranches: 1, maxItems: 100, modules: ['ims', 'rms'] },
  },
  {
    code: 'STARTER',
    name: 'Starter',
    monthlyPriceUsd: 29,
    // Local-first price points, not spot-FX conversions (docs/GTM.md §0).
    prices: { NGN: 45000, GHS: 450, KES: 4500, XOF: 18000, USD: 29, GBP: 25, EUR: 27 },
    description: 'For growing teams — adds HR management.',
    limits: {
      maxUsers: 10,
      maxBranches: 3,
      maxItems: 1000,
      modules: ['ims', 'rms', 'hrms'],
    },
  },
  {
    code: 'GROWTH',
    name: 'Growth',
    monthlyPriceUsd: 99,
    prices: { NGN: 150000, GHS: 1500, KES: 15000, XOF: 60000, USD: 99, GBP: 79, EUR: 89 },
    description: 'Unlimited items — adds accounting and invoicing.',
    limits: {
      maxUsers: 50,
      maxBranches: 10,
      maxItems: -1,
      modules: ['ims', 'rms', 'hrms', 'accounting', 'invoicing'],
    },
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    monthlyPriceUsd: 299,
    prices: { NGN: 450000, GHS: 4500, KES: 45000, XOF: 180000, USD: 299, GBP: 239, EUR: 269 },
    description: 'Everything unlimited — all modules plus audit trail.',
    limits: {
      maxUsers: -1,
      maxBranches: -1,
      maxItems: -1,
      modules: ['ims', 'rms', 'hrms', 'accounting', 'invoicing', 'audit'],
    },
  },
];

/** A plan's price in the tenant's currency, falling back to USD. */
function localPriceFor(plan: Plan, currency: string): { currency: string; amount: number } {
  const amount = plan.prices?.[currency];
  if (amount != null) {
    return { currency, amount: Number(amount) };
  }
  return { currency: 'USD', amount: Number(plan.monthlyPriceUsd) };
}

@Injectable()
export class BillingService {
  private seedPromise: Promise<void> | null = null;

  constructor(
    @InjectRepository(Plan, 'landlord')
    private planRepository: Repository<Plan>,
    @InjectRepository(TenantSubscription, 'landlord')
    private subscriptionRepository: Repository<TenantSubscription>,
    // Tenant-connection repositories: scoped to the caller's schema by the
    // global TenantTransactionInterceptor (search_path), like other services.
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(InventoryItem)
    private itemRepository: Repository<InventoryItem>,
    // Default (tenant) connection, used with schema-QUALIFIED raw SQL for the
    // apps model: FeatureGateGuard runs BEFORE TenantTransactionInterceptor
    // pins the request's search_path, so tenant repositories cannot be
    // trusted there — explicit "<schema>".businesses references are.
    @InjectDataSource()
    private readonly tenantDataSource: DataSource,
  ) {}

  /** Tenant schemas confirmed (this process) to have businesses.enabled_apps. */
  private readonly appsColumnEnsured = new Set<string>();

  /** Lazily seed the plans table if it is empty (idempotent, single-flight). */
  private ensurePlansSeeded(): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = (async () => {
        const count = await this.planRepository.count();
        if (count === 0) {
          await this.planRepository.save(
            PLAN_SEED.map((seed) =>
              this.planRepository.create({ ...seed, isActive: true }),
            ),
          );
          return;
        }
        // Backfill: plans seeded before local-first pricing lack `prices`.
        const unpriced = await this.planRepository.find({ where: { prices: null as any } });
        for (const plan of unpriced) {
          const seed = PLAN_SEED.find((s) => s.code === plan.code);
          if (seed) {
            plan.prices = seed.prices;
            await this.planRepository.save(plan);
          }
        }
      })().catch((error) => {
        // Allow a retry on the next call instead of caching the failure.
        this.seedPromise = null;
        throw error;
      });
    }
    return this.seedPromise;
  }

  /**
   * The tenant's billing currency (business.currency, set from the
   * registration country). Runs inside the request's tenant transaction,
   * so the unqualified query follows the pinned search_path.
   */
  private async getTenantCurrency(): Promise<string> {
    try {
      const rows = await this.userRepository.query(
        'SELECT currency FROM businesses LIMIT 1',
      );
      return rows?.[0]?.currency || 'NGN';
    } catch {
      return 'NGN';
    }
  }

  async getPlans(): Promise<Array<Plan & { localPrice: { currency: string; amount: number } }>> {
    await this.ensurePlansSeeded();
    const [plans, currency] = await Promise.all([
      this.planRepository.find({
        where: { isActive: true },
        order: { monthlyPriceUsd: 'ASC' },
      }),
      this.getTenantCurrency(),
    ]);
    return plans.map((plan) => ({ ...plan, localPrice: localPriceFor(plan, currency) }));
  }

  /** Attaches localPrice (tenant currency) to a subscription's plan. */
  async withLocalPrice<T extends { plan?: Plan | null }>(subscription: T): Promise<T> {
    if (subscription?.plan) {
      const currency = await this.getTenantCurrency();
      (subscription.plan as any).localPrice = localPriceFor(subscription.plan, currency);
    }
    return subscription;
  }

  private async getPlanByCode(code: string): Promise<Plan> {
    await this.ensurePlansSeeded();
    const plan = await this.planRepository.findOne({
      where: { code: code as PlanCode, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException(`Plan '${code}' not found`);
    }
    return plan;
  }

  /**
   * Returns the tenant's subscription, creating one on first use:
   * a 14-day GROWTH trial (status TRIALING). When the trial has expired,
   * the subscription is downgraded to FREE / ACTIVE on read.
   */
  async getOrCreateSubscription(tenantId: string): Promise<TenantSubscription> {
    await this.ensurePlansSeeded();

    let subscription = await this.subscriptionRepository.findOne({
      where: { tenantId },
    });

    if (!subscription) {
      const growth = await this.getPlanByCode('GROWTH');
      const now = new Date();
      const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      subscription = await this.subscriptionRepository.save(
        this.subscriptionRepository.create({
          tenantId,
          planId: growth.id,
          status: 'TRIALING',
          trialEndsAt: trialEnd,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
        }),
      );
    }

    // Trial expired → downgrade to FREE / ACTIVE.
    if (
      subscription.status === 'TRIALING' &&
      subscription.trialEndsAt &&
      new Date(subscription.trialEndsAt).getTime() < Date.now()
    ) {
      const free = await this.getPlanByCode('FREE');
      const now = new Date();
      subscription.planId = free.id;
      subscription.status = 'ACTIVE';
      subscription.trialEndsAt = null;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = this.addMonths(now, 1);
      subscription = await this.subscriptionRepository.save(subscription);
    }

    if (!subscription.plan || subscription.plan.id !== subscription.planId) {
      subscription.plan = await this.planRepository.findOne({
        where: { id: subscription.planId },
      });
    }

    return subscription;
  }

  /**
   * Change the tenant's plan. No real payment is taken yet — the subscription
   * becomes ACTIVE for a one-month period (payment provider stubs are on the
   * entity for later Stripe/Paystack integration).
   */
  async changePlan(tenantId: string, planCode: string): Promise<TenantSubscription> {
    if (!planCode) {
      throw new BadRequestException('planCode is required');
    }
    const plan = await this.getPlanByCode(planCode);
    const subscription = await this.getOrCreateSubscription(tenantId);

    const now = new Date();
    subscription.planId = plan.id;
    subscription.plan = plan;
    subscription.status = 'ACTIVE';
    subscription.trialEndsAt = null;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = this.addMonths(now, 1);

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Current usage vs plan limits. Counts are taken from the calling request's
   * tenant schema (search_path pinned by TenantTransactionInterceptor), so a
   * tenant admin always sees their own tenant's usage.
   */
  async getUsage(tenantId: string) {
    const subscription = await this.getOrCreateSubscription(tenantId);

    const [users, branches, items] = await Promise.all([
      this.userRepository.count(),
      this.branchRepository.count(),
      this.itemRepository.count(),
    ]);

    return {
      usage: { users, branches, items },
      limits: subscription.plan?.limits || null,
      plan: subscription.plan
        ? {
            code: subscription.plan.code,
            name: subscription.plan.name,
            monthlyPriceUsd: Number(subscription.plan.monthlyPriceUsd),
          }
        : null,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
    };
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  // ---------------------------------------------------------------------
  // Apps model (docs/APPS-MODEL.md §3) — effective apps + enable/disable
  // ---------------------------------------------------------------------

  /**
   * Lazily add businesses.enabled_apps to a tenant schema. Dev synchronize
   * only touches the public schema, and existing tenant schemas predate the
   * column — this is the zero-downtime path for legacy tenants. Checked (and
   * cached) per schema per process; ALTER only runs when actually missing.
   */
  private async ensureEnabledAppsColumn(schemaName: string): Promise<void> {
    if (this.appsColumnEnsured.has(schemaName)) {
      return;
    }
    const manager = this.tenantDataSource.manager;
    const found = await manager.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'businesses'
         AND column_name = 'enabled_apps'`,
      [schemaName],
    );
    if (found.length === 0) {
      await manager.query(
        `ALTER TABLE "${schemaName}"."businesses"
         ADD COLUMN IF NOT EXISTS "enabled_apps" jsonb`,
      );
    }
    this.appsColumnEnsured.add(schemaName);
  }

  /**
   * The tenant's single Business row, read with schema-qualified SQL so it is
   * correct both inside the request transaction (controllers) and outside it
   * (guards, which run before the search_path is pinned).
   */
  private async getBusinessAppsRow(schemaName: string): Promise<{
    id: string;
    enabledApps: string[] | null;
    businessType: string;
  }> {
    await this.ensureEnabledAppsColumn(schemaName);
    const rows = await this.tenantDataSource.manager.query(
      `SELECT id, enabled_apps, business_type
       FROM "${schemaName}"."businesses"
       ORDER BY created_at ASC
       LIMIT 1`,
    );
    if (rows.length === 0) {
      throw new NotFoundException('Business not found');
    }
    return {
      id: rows[0].id,
      enabledApps: rows[0].enabled_apps ?? null,
      businessType: rows[0].business_type || 'general',
    };
  }

  /**
   * Apps the plan side allows. TRIALING passes every app (same semantics the
   * FeatureGateGuard always had for trials); otherwise the plan's
   * limits.modules are mapped (legacy or canonical keys) to app keys.
   */
  private appsAllowedByPlan(subscription: TenantSubscription): AppKey[] {
    if (subscription.status === 'TRIALING') {
      return [...APP_KEYS];
    }
    return appsForPlanModules(subscription.plan?.limits?.modules || []);
  }

  /**
   * Effective apps = (Business.enabledApps ?? legacy-all) ∩ plan-allowed apps.
   * Computed at read time, never stored — plan changes apply instantly, and
   * NULL enabledApps keeps legacy tenants exactly as they behave today.
   */
  async getEffectiveApps(
    tenantId: string,
    schemaName: string,
  ): Promise<AppKey[]> {
    const [subscription, business] = await Promise.all([
      this.getOrCreateSubscription(tenantId),
      this.getBusinessAppsRow(schemaName),
    ]);
    const allowed = new Set(this.appsAllowedByPlan(subscription));
    const enabled = new Set(business.enabledApps ?? APP_KEYS);
    return APP_KEYS.filter((key) => enabled.has(key) && allowed.has(key));
  }

  /** Registry + per-app state for GET /billing/apps and the Apps page. */
  async getAppsOverview(tenantId: string, schemaName: string) {
    const [subscription, business] = await Promise.all([
      this.getOrCreateSubscription(tenantId),
      this.getBusinessAppsRow(schemaName),
    ]);
    const allowed = new Set(this.appsAllowedByPlan(subscription));
    const enabled = new Set(business.enabledApps ?? APP_KEYS);

    const apps = APP_REGISTRY.map((app) => ({
      key: app.key,
      name: app.name,
      description: app.description,
      enabled: enabled.has(app.key),
      allowedByPlan: allowed.has(app.key),
      dependencies: app.dependencies,
      dependents: dependentsOf(app.key),
    }));

    return {
      apps,
      effective: APP_KEYS.filter(
        (key) => enabled.has(key) && allowed.has(key),
      ),
    };
  }

  /**
   * Enable/disable one app for the tenant's business.
   * - Enabling auto-enables missing dependencies (returned as alsoEnabled)
   *   and rejects plan-locked apps.
   * - Disabling is refused (409) while other enabled apps depend on the key;
   *   it never deletes data — re-enabling restores everything.
   * - A legacy NULL enabledApps is converted to an explicit full list on the
   *   first write, preserving current behavior.
   */
  async setAppEnabled(
    tenantId: string,
    schemaName: string,
    key: string,
    enable: boolean,
  ) {
    const app = getApp(key);
    if (!app) {
      throw new BadRequestException(`Unknown app '${key}'`);
    }

    const [subscription, business] = await Promise.all([
      this.getOrCreateSubscription(tenantId),
      this.getBusinessAppsRow(schemaName),
    ]);
    const allowed = new Set(this.appsAllowedByPlan(subscription));
    // NULL legacy fallback = everything; snapshot it explicitly on first write.
    const current = new Set(
      (business.enabledApps ?? APP_KEYS).filter((k) => getApp(k)),
    );

    let alsoEnabled: AppKey[] = [];
    if (enable) {
      const closure = expandDependencies([key]);
      const planLocked = closure.filter((k) => !allowed.has(k));
      if (planLocked.length > 0) {
        const names = planLocked.map((k) => getApp(k)?.name ?? k).join(', ');
        throw new ForbiddenException(
          `${names} ${planLocked.length === 1 ? 'is' : 'are'} not included in your current plan. Please upgrade to enable ${app.name}.`,
        );
      }
      alsoEnabled = closure.filter((k) => k !== app.key && !current.has(k));
      closure.forEach((k) => current.add(k));
    } else {
      current.delete(app.key);
      const blockers = dependentsOf(app.key).filter((k) => current.has(k));
      if (blockers.length > 0) {
        const names = blockers.map((k) => getApp(k)?.name ?? k).join(', ');
        throw new ConflictException(
          `Cannot disable ${app.name} — ${names} depend${blockers.length === 1 ? 's' : ''} on it. Disable ${blockers.length === 1 ? 'it' : 'them'} first.`,
        );
      }
    }

    const enabledApps = APP_KEYS.filter((k) => current.has(k));
    await this.tenantDataSource.manager.query(
      `UPDATE "${schemaName}"."businesses"
       SET enabled_apps = $1::jsonb, updated_at = now()
       WHERE id = $2`,
      [JSON.stringify(enabledApps), business.id],
    );

    return {
      enabledApps,
      effective: enabledApps.filter((k) => allowed.has(k)),
      alsoEnabled,
    };
  }
}
