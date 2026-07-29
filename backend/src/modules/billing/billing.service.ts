import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  APP_KEYS,
  APP_REGISTRY,
  AppKey,
  LEGACY_PLAN_MODULE_TO_APPS,
  appsForPlanModules,
  dependentsOf,
  exclusiveConflicts,
  expandDependencies,
  getApp,
  isAssist,
} from '../../common/apps/app-registry';
import { Plan, PlanCode, PlanLimits } from './entities/plan.entity';
import {
  TenantSubscription,
} from './entities/tenant-subscription.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import {
  AppAccessRequest,
  AccessRequestStatus,
} from './entities/app-access-request.entity';
import { PricingConfig } from './entities/pricing-config.entity';
import { User } from '../../common/entities/user.entity';
import { Branch } from '../../common/entities/branch.entity';
import { InventoryItem } from '../ims/entities/inventory-item.entity';
import { PaystackAdapter } from '../integrations/adapters/paystack.adapter';
import {
  computeQuote,
  pricingConfig,
  DEFAULT_PRICING,
  PricingConfigData,
  PRICING_CURRENCIES,
  Quote,
  QuoteInput,
} from './pricing';

const DEFAULT_TRIAL_DAYS = 14;

/** Super-admin plan CRUD inputs (validated by the admin DTOs at the boundary). */
export interface CreatePlanInput {
  code: string;
  name: string;
  monthlyPriceUsd: number;
  prices?: Record<string, number>;
  description?: string;
  limits: PlanLimits;
  isActive?: boolean;
}

export interface UpdatePlanInput {
  name?: string;
  monthlyPriceUsd?: number;
  prices?: Record<string, number>;
  description?: string;
  limits?: PlanLimits;
  isActive?: boolean;
}

/**
 * Super-admin pricing-config update (validated at the boundary by the admin
 * DTO + BillingService.updatePricingConfig). Every field is optional — only the
 * provided maps/values change; omitted apps/currencies keep their stored value.
 */
export interface UpdatePricingInput {
  /** Partial map of appKey → (currency → monthly price). */
  appPrices?: Record<string, Record<string, number>>;
  /** Partial map of usage unit → (currency → monthly price). */
  usagePrices?: {
    branch?: Record<string, number>;
    user?: Record<string, number>;
  };
  includedBranches?: number;
  includedUsers?: number;
}

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
  private pricingSeedPromise: Promise<void> | null = null;
  private readonly logger = new Logger(BillingService.name);

  /**
   * How many days the all-access free trial runs before a tenant must pay.
   * Configurable via env TRIAL_DAYS (founder direction); defaults to 14. A
   * non-positive or non-numeric value falls back to the default.
   */
  private trialDays(): number {
    const raw = Number(this.configService.get<string>('TRIAL_DAYS'));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_TRIAL_DAYS;
  }

  constructor(
    @InjectRepository(Plan, 'landlord')
    private planRepository: Repository<Plan>,
    @InjectRepository(TenantSubscription, 'landlord')
    private subscriptionRepository: Repository<TenantSubscription>,
    @InjectRepository(SubscriptionPayment, 'landlord')
    private paymentRepository: Repository<SubscriptionPayment>,
    @InjectRepository(AppAccessRequest, 'landlord')
    private accessRequestRepository: Repository<AppAccessRequest>,
    @InjectRepository(PricingConfig, 'landlord')
    private pricingConfigRepository: Repository<PricingConfig>,
    private readonly configService: ConfigService,
    private readonly paystackAdapter: PaystackAdapter,
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

  /**
   * The raw plan catalog (super-admin back-office, read-only). Unlike getPlans,
   * this does NOT attach a tenant-currency localPrice — the super-admin view is
   * cross-tenant, so a single "local" price would be misleading.
   */
  async getPlanCatalog(): Promise<Plan[]> {
    await this.ensurePlansSeeded();
    return this.planRepository.find({
      where: { isActive: true },
      order: { monthlyPriceUsd: 'ASC' },
    });
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
      const trialEnd = new Date(
        now.getTime() + this.trialDays() * 24 * 60 * 60 * 1000,
      );
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

    // Trial expired with no paid subscription → EXPIRED (read-only until they
    // pay). No permanent free tier: free is the trial window only. planId is
    // left as-is so the tenant can still READ everything they had during the
    // trial; TrialLockGuard blocks writes based on status/price.
    if (
      subscription.status === 'TRIALING' &&
      subscription.trialEndsAt &&
      new Date(subscription.trialEndsAt).getTime() < Date.now()
    ) {
      subscription.status = 'EXPIRED';
      subscription.trialEndsAt = null;
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
  async changePlan(
    tenantId: string,
    planCode: string,
    opts: { allowPaid?: boolean } = {},
  ): Promise<TenantSubscription> {
    if (!planCode) {
      throw new BadRequestException('planCode is required');
    }
    const plan = await this.getPlanByCode(planCode);

    // Revenue guard: a PAID plan can only be activated by the payment webhook
    // (opts.allowPaid) after a verified charge — never by a direct self-service
    // switch. Without this, /billing/subscription/change would let a tenant
    // upgrade to a paid plan (and unlock its gated apps) without paying.
    if (!opts.allowPaid) {
      const currency = await this.getTenantCurrency();
      const price = localPriceFor(plan, currency);
      if (price.amount && price.amount > 0) {
        throw new BadRequestException(
          'This is a paid plan — start a checkout to pay for it. Only free plans can be switched to directly.',
        );
      }
    }

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

  // ---------------------------------------------------------------------
  // Plan CRUD (super-admin) — LANDLORD-scoped. Guarded by SuperAdminGuard on
  // the /admin controller; this service assumes the caller is authorized.
  // ---------------------------------------------------------------------

  /**
   * Validate a plan's limits.modules against the shared app vocabulary: a
   * module is valid if it is a canonical app key (APP_KEYS) OR a legacy plan
   * module key (LEGACY_PLAN_MODULE_TO_APPS — 'ims', 'rms', 'accounting', ...).
   * Both are accepted because appsAllowedByPlan maps either at read time, and
   * the built-in seeds use the legacy keys.
   */
  private assertValidModules(modules: string[]): void {
    const invalid = (modules || []).filter(
      (m) =>
        !APP_KEYS.includes(m as AppKey) && !LEGACY_PLAN_MODULE_TO_APPS[m],
    );
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Unknown plan module(s): ${invalid.join(', ')}. Allowed: ${[
          ...Object.keys(LEGACY_PLAN_MODULE_TO_APPS),
          ...APP_KEYS,
        ].join(', ')}`,
      );
    }
  }

  /** Create a new plan (super-admin). */
  async createPlan(input: CreatePlanInput): Promise<Plan> {
    await this.ensurePlansSeeded();
    this.assertValidModules(input.limits?.modules || []);

    const existing = await this.planRepository.findOne({
      where: { code: input.code as PlanCode },
    });
    if (existing) {
      throw new ConflictException(`Plan '${input.code}' already exists`);
    }

    const plan = this.planRepository.create({
      code: input.code as PlanCode,
      name: input.name,
      monthlyPriceUsd: input.monthlyPriceUsd,
      prices: input.prices ?? null,
      description: input.description,
      limits: input.limits,
      isActive: input.isActive ?? true,
    });
    return this.planRepository.save(plan);
  }

  /**
   * Update an existing plan by code (super-admin). `code` is immutable — it is
   * the plan's stable identity referenced by tenant subscriptions. Only the
   * provided fields change. Reactivating (isActive:true) is supported here.
   */
  async updatePlan(code: string, input: UpdatePlanInput): Promise<Plan> {
    await this.ensurePlansSeeded();
    const plan = await this.planRepository.findOne({
      where: { code: code as PlanCode },
    });
    if (!plan) {
      throw new NotFoundException(`Plan '${code}' not found`);
    }

    if (input.limits !== undefined) {
      this.assertValidModules(input.limits.modules || []);
      plan.limits = input.limits;
    }
    if (input.name !== undefined) plan.name = input.name;
    if (input.monthlyPriceUsd !== undefined) {
      plan.monthlyPriceUsd = input.monthlyPriceUsd;
    }
    if (input.prices !== undefined) plan.prices = input.prices;
    if (input.description !== undefined) plan.description = input.description;
    if (input.isActive !== undefined) plan.isActive = input.isActive;

    return this.planRepository.save(plan);
  }

  /**
   * Soft-delete (deactivate) a plan by code (super-admin). Never hard-deletes:
   * a deactivated plan disappears from getPlans/getPlanCatalog (new subscribers
   * cannot pick it) but the row survives, so tenants already subscribed to it
   * keep working — their subscription loads the plan by id regardless of
   * isActive.
   */
  async deactivatePlan(code: string): Promise<Plan> {
    await this.ensurePlansSeeded();
    const plan = await this.planRepository.findOne({
      where: { code: code as PlanCode },
    });
    if (!plan) {
      throw new NotFoundException(`Plan '${code}' not found`);
    }
    plan.isActive = false;
    return this.planRepository.save(plan);
  }

  // ---------------------------------------------------------------------
  // Paystack checkout (paid plan upgrade) — money-path.
  // ---------------------------------------------------------------------

  private paystackSecretKey(): string | undefined {
    return this.configService.get<string>('PAYSTACK_SECRET_KEY');
  }

  /**
   * Start a plan-upgrade checkout.
   *
   *  - FREE / zero-price plans keep the existing INSTANT path (changePlan) — no
   *    charge, no provider round-trip.
   *  - A paid plan initializes a Paystack transaction (test keys from env) for
   *    the tenant's local-currency price and returns the hosted checkout URL.
   *    A PENDING SubscriptionPayment row (unique `reference`) is written FIRST
   *    as the idempotency ledger; the plan is NOT activated here — only the
   *    signature-verified charge.success webhook activates it.
   *
   * Runs inside the tenant request transaction, so getTenantCurrency (which
   * reads businesses.currency) resolves the caller's schema.
   */
  async checkout(
    tenantId: string,
    planCode: string,
    user: { email?: string } | undefined,
  ): Promise<
    | { free: true; subscription: TenantSubscription }
    | { free: false; authorizationUrl: string; reference: string }
  > {
    if (!planCode) {
      throw new BadRequestException('planCode is required');
    }
    const plan = await this.getPlanByCode(planCode);
    const currency = await this.getTenantCurrency();
    const price = localPriceFor(plan, currency);

    // Free / zero-price → existing instant path.
    if (!price.amount || price.amount <= 0) {
      const subscription = await this.changePlan(tenantId, planCode);
      return { free: true, subscription };
    }

    const email = user?.email;
    if (!email) {
      throw new BadRequestException('A billing email is required for checkout');
    }
    const secretKey = this.paystackSecretKey();
    if (!secretKey) {
      throw new BadRequestException(
        'Payments are not configured — set PAYSTACK_SECRET_KEY',
      );
    }

    // Idempotency key + ledger row (written before the provider call).
    const reference = `KZA-SUB-${randomUUID()}`;
    const payment = await this.paymentRepository.save(
      this.paymentRepository.create({
        tenantId,
        planId: plan.id,
        planCode: plan.code,
        provider: 'paystack',
        reference,
        amount: price.amount,
        currency: price.currency,
        status: 'PENDING',
      }),
    );

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4000';

    let init: { authorizationUrl: string; reference: string };
    try {
      init = await this.paystackAdapter.initializeTransaction(
        {
          email,
          amountSubunit: Math.round(price.amount * 100),
          currency: price.currency,
          reference,
          metadata: {
            tenantId,
            planCode: plan.code,
            kind: 'subscription_upgrade',
          },
          callbackUrl: `${frontendUrl}/settings/billing?ref=${reference}`,
        },
        { secretKey },
      );
    } catch (error) {
      payment.status = 'FAILED';
      payment.failureReason = (error as Error).message;
      await this.paymentRepository.save(payment);
      throw error;
    }

    payment.authorizationUrl = init.authorizationUrl;
    await this.paymentRepository.save(payment);

    // Record the pending provider ref on the subscription stub fields.
    const subscription = await this.getOrCreateSubscription(tenantId);
    subscription.paymentProvider = 'paystack';
    subscription.paymentProviderRef = reference;
    await this.subscriptionRepository.save(subscription);

    return { free: false, authorizationUrl: init.authorizationUrl, reference };
  }

  /**
   * Handle a Paystack webhook for a subscription checkout.
   *
   * SECURITY / money-path:
   *  - Signature is verified by REUSING PaystackAdapter.parseWebhook (HMAC-SHA512
   *    over the raw body with the env secret key). A bad/absent signature throws
   *    UnauthorizedException → 401; we NEVER act on an unverified payload.
   *  - Only 'charge.success' normalizes to a non-null event; any other event
   *    type returns null and is ignored (never activates a plan).
   *  - Idempotency: the reference is looked up in the SubscriptionPayment ledger.
   *    An unknown reference is ignored (it is not one of our checkouts). A row
   *    already SUCCESS is a duplicate delivery → acknowledged as a no-op. Only a
   *    PENDING row whose paid amount covers the expected amount is activated,
   *    exactly once, via the idempotent changePlan.
   *  - Runs OUTSIDE any tenant context (public route); changePlan and all repos
   *    used here are landlord-scoped, so this is safe.
   */
  async handlePaystackWebhook(
    headers: Record<string, any>,
    rawBody: string,
  ): Promise<{ handled: boolean; reason: string; paymentId?: string }> {
    const secretKey = this.paystackSecretKey();
    if (!secretKey) {
      this.logger.warn(
        'Paystack subscription webhook received but PAYSTACK_SECRET_KEY is not set — ignoring',
      );
      return { handled: false, reason: 'not_configured' };
    }

    // Reuse the adapter's HMAC verification. Throws UnauthorizedException on a
    // bad signature (surfaced as 401 by the global exception filter).
    const normalized = this.paystackAdapter.parseWebhook(
      headers,
      rawBody,
      { secretKey },
      '',
    );
    if (!normalized) {
      // Non-success event type — acknowledge without acting.
      return { handled: false, reason: 'ignored_event' };
    }

    const payment = await this.paymentRepository.findOne({
      where: { reference: normalized.reference },
    });
    if (!payment) {
      // Not one of our subscription checkouts (e.g. a tenant collection).
      return { handled: false, reason: 'unknown_reference' };
    }
    if (payment.status === 'SUCCESS') {
      // Duplicate delivery — Paystack retries. Idempotent no-op.
      return { handled: true, reason: 'duplicate', paymentId: payment.id };
    }
    if (payment.status === 'FAILED') {
      return { handled: false, reason: 'already_failed', paymentId: payment.id };
    }

    // Defensive: never trust the provider's amount blindly. Require the paid
    // amount to cover the expected price (0.5 minor-unit tolerance).
    if (Number(normalized.amount) + 0.5 < Number(payment.amount)) {
      payment.status = 'FAILED';
      payment.failureReason = `Underpayment: paid ${normalized.amount} ${normalized.currency}, expected ${payment.amount} ${payment.currency}`;
      await this.paymentRepository.save(payment);
      this.logger.warn(
        `Rejected subscription payment ${payment.id}: ${payment.failureReason}`,
      );
      return { handled: false, reason: 'amount_mismatch', paymentId: payment.id };
    }

    // Activate idempotently. À-la-carte checkouts carry a `selection` (apps +
    // usage) and activate that; legacy tier checkouts re-set the plan. Both are
    // safe to run again on a duplicate delivery (getOrCreateSubscription +
    // re-set are idempotent).
    if (payment.selection) {
      await this.activateQuoteSubscription(payment.tenantId, {
        apps: payment.selection.apps,
        branches: payment.selection.branches,
        users: payment.selection.users,
        amount: Number(payment.amount),
        currency: payment.currency,
        schemaName: payment.selection.schemaName,
      });
    } else if (payment.planCode) {
      // allowPaid: this is the verified post-payment activation path.
      await this.changePlan(payment.tenantId, payment.planCode, {
        allowPaid: true,
      });
    }

    payment.status = 'SUCCESS';
    payment.providerRef = normalized.reference;
    payment.processedAt = new Date();
    await this.paymentRepository.save(payment);

    // Confirm the provider ref on the subscription stub fields.
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId: payment.tenantId },
    });
    if (subscription) {
      subscription.paymentProvider = 'paystack';
      subscription.paymentProviderRef = normalized.reference;
      await this.subscriptionRepository.save(subscription);
    }

    this.logger.log(
      `Activated plan ${payment.planCode} for tenant ${payment.tenantId} (payment ${payment.id})`,
    );
    return { handled: true, reason: 'activated', paymentId: payment.id };
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

  /**
   * Whether the tenant is READ-ONLY (free trial elapsed with no active PAID
   * subscription) — TrialLockGuard blocks writes when true. TRIALING is never
   * read-only. ACTIVE is read-only only when the current plan is free/zero-price
   * across every currency (so switching to a free plan can't escape the
   * paywall). EXPIRED / PAST_DUE / CANCELED are always read-only.
   *
   * Landlord-scoped only (no tenant-schema read) so it is safe to call from a
   * guard that runs before the request's search_path is pinned. getOrCreate…
   * also performs the lazy TRIALING→EXPIRED transition on read.
   */
  async isReadOnly(tenantId: string): Promise<boolean> {
    const subscription = await this.getOrCreateSubscription(tenantId);
    if (subscription.status === 'TRIALING') {
      return false;
    }
    if (subscription.status === 'ACTIVE') {
      // Paid via an à-la-carte selection (amountMajor > 0) → full access.
      if (Number(subscription.amountMajor) > 0) {
        return false;
      }
      // Paid via a fixed tier (plan has a non-zero price in any currency).
      const plan = subscription.plan;
      const anyPaid =
        Number(plan?.monthlyPriceUsd) > 0 ||
        Object.values(plan?.prices ?? {}).some((v) => Number(v) > 0);
      return !anyPaid;
    }
    // EXPIRED / PAST_DUE / CANCELED
    return true;
  }

  // ---------------------------------------------------------------------
  // À-la-carte pricing (docs: pricing.ts) — pure computation, charges nothing.
  // Config is persisted LANDLORD-scoped (PricingConfig, one global row) and
  // super-admin editable; the code constants in pricing.ts remain the fallback.
  // ---------------------------------------------------------------------

  /**
   * Lazily seed the single global pricing-config row from the code defaults if
   * the table is empty (idempotent, single-flight — mirrors ensurePlansSeeded).
   */
  private ensurePricingSeeded(): Promise<void> {
    if (!this.pricingSeedPromise) {
      this.pricingSeedPromise = (async () => {
        const existing = await this.pricingConfigRepository.findOne({
          where: { key: 'global' },
        });
        if (!existing) {
          await this.pricingConfigRepository.save(
            this.pricingConfigRepository.create({
              key: 'global',
              // Deep-copy the defaults so later edits never mutate the code
              // constants (they are shared module-level objects).
              appPrices: JSON.parse(JSON.stringify(DEFAULT_PRICING.appPrices)),
              usagePrices: JSON.parse(
                JSON.stringify(DEFAULT_PRICING.usagePrices),
              ),
              includedBranches: DEFAULT_PRICING.included.branches,
              includedUsers: DEFAULT_PRICING.included.users,
            }),
          );
        }
      })().catch((error) => {
        // Allow a retry on the next call instead of caching the failure.
        this.pricingSeedPromise = null;
        throw error;
      });
    }
    return this.pricingSeedPromise;
  }

  /**
   * Load the persisted pricing config as the engine's PricingConfigData. Seeds
   * on first use; falls back to the code defaults if the row is somehow absent
   * so the pricing endpoints never break when unseeded.
   */
  private async loadPricingConfig(): Promise<PricingConfigData> {
    await this.ensurePricingSeeded();
    const row = await this.pricingConfigRepository.findOne({
      where: { key: 'global' },
    });
    if (!row) {
      return DEFAULT_PRICING;
    }
    return {
      appPrices: row.appPrices ?? DEFAULT_PRICING.appPrices,
      usagePrices: row.usagePrices ?? DEFAULT_PRICING.usagePrices,
      included: {
        branches: row.includedBranches,
        users: row.includedUsers,
      },
    };
  }

  /** The pricing catalog in the tenant's currency (for the UI builder). */
  async getPricingConfig() {
    const [currency, config] = await Promise.all([
      this.getTenantCurrency(),
      this.loadPricingConfig(),
    ]);
    return pricingConfig(currency, config);
  }

  /** Compute an itemized monthly quote for an app + usage selection. */
  async quote(input: QuoteInput): Promise<Quote> {
    const [config, tenantCurrency] = await Promise.all([
      this.loadPricingConfig(),
      input.currency ? Promise.resolve(input.currency) : this.getTenantCurrency(),
    ]);
    return computeQuote({ ...input, currency: tenantCurrency }, config);
  }

  /**
   * Validate a proposed à-la-carte selection: no two apps from the same
   * exclusive group (items ⊕ rms), and an assist requires a non-assist host.
   * Returns the cleaned, dependency-agnostic app list (unknown keys dropped).
   */
  private validateSelection(apps: string[]): string[] {
    const cleaned = (apps || []).filter((k) => getApp(k));
    for (const key of cleaned) {
      const conflicts = exclusiveConflicts(key, cleaned).filter(
        (c) => c !== key,
      );
      if (conflicts.length > 0) {
        const names = [key, ...conflicts]
          .map((k) => getApp(k)?.name ?? k)
          .join(' & ');
        throw new BadRequestException(
          `${names} can't be combined — they are separate business types. Pick one.`,
        );
      }
    }
    if (cleaned.some((k) => isAssist(k)) && !cleaned.some((k) => !isAssist(k))) {
      throw new BadRequestException(
        'Add-ons (like AI Assist) need at least one business app selected.',
      );
    }
    return cleaned;
  }

  /**
   * À-la-carte checkout (money-path). Computes the AUTHORITATIVE quote
   * server-side (client amounts are never trusted), validates the selection,
   * then:
   *  - zero total → activate immediately, no charge;
   *  - paid → reuse the exact Paystack init + PENDING SubscriptionPayment
   *    idempotency ledger (unique `reference`) as the tier checkout. The plan is
   *    NOT activated here — only the signature-verified charge.success webhook
   *    activates it, via the stored `selection`.
   */
  async checkoutQuote(
    tenantId: string,
    schemaName: string,
    input: { apps: string[]; branches?: number; users?: number },
    user: { email?: string } | undefined,
  ): Promise<
    | { free: true; subscription: TenantSubscription }
    | {
        free: false;
        authorizationUrl: string;
        reference: string;
        quote: Quote;
      }
  > {
    const apps = this.validateSelection(input.apps);
    const quote = await this.quote({
      apps,
      branches: input.branches,
      users: input.users,
    });
    const branches = Math.max(
      quote.includedBranches,
      Math.floor(input.branches ?? quote.includedBranches),
    );
    const users = Math.max(
      quote.includedUsers,
      Math.floor(input.users ?? quote.includedUsers),
    );

    // Nothing to charge (only free/assist apps within the included allowance).
    if (!quote.total || quote.total <= 0) {
      const subscription = await this.activateQuoteSubscription(tenantId, {
        apps,
        branches,
        users,
        amount: 0,
        currency: quote.currency,
        schemaName,
      });
      return { free: true, subscription };
    }

    const email = user?.email;
    if (!email) {
      throw new BadRequestException('A billing email is required for checkout');
    }
    const secretKey = this.paystackSecretKey();
    if (!secretKey) {
      throw new BadRequestException(
        'Payments are not configured — set PAYSTACK_SECRET_KEY',
      );
    }

    const reference = `KZA-SUB-${randomUUID()}`;
    const payment = await this.paymentRepository.save(
      this.paymentRepository.create({
        tenantId,
        planId: null,
        planCode: null,
        selection: { apps, branches, users, schemaName },
        provider: 'paystack',
        reference,
        amount: quote.total,
        currency: quote.currency,
        status: 'PENDING',
      }),
    );

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5001';

    let init: { authorizationUrl: string; reference: string };
    try {
      init = await this.paystackAdapter.initializeTransaction(
        {
          email,
          amountSubunit: Math.round(quote.total * 100),
          currency: quote.currency,
          reference,
          metadata: { tenantId, kind: 'alacarte_subscription' },
          callbackUrl: `${frontendUrl}/settings/billing?ref=${reference}`,
        },
        { secretKey },
      );
    } catch (error) {
      payment.status = 'FAILED';
      payment.failureReason = (error as Error).message;
      await this.paymentRepository.save(payment);
      throw error;
    }

    payment.authorizationUrl = init.authorizationUrl;
    await this.paymentRepository.save(payment);

    const subscription = await this.getOrCreateSubscription(tenantId);
    subscription.paymentProvider = 'paystack';
    subscription.paymentProviderRef = reference;
    await this.subscriptionRepository.save(subscription);

    return { free: false, authorizationUrl: init.authorizationUrl, reference, quote };
  }

  /**
   * Activate an à-la-carte subscription for a tenant (idempotent). Sets the
   * subscription ACTIVE with the paid selection + period, and applies the paid
   * apps to the business's enabled_apps (dependency-closed) via schema-qualified
   * SQL — safe to call from the webhook (no tenant request context). A failure
   * to apply enabled_apps never fails activation (the payment already
   * succeeded); it is logged for reconciliation.
   */
  async activateQuoteSubscription(
    tenantId: string,
    sel: {
      apps: string[];
      branches: number;
      users: number;
      amount: number;
      currency: string;
      schemaName: string;
    },
  ): Promise<TenantSubscription> {
    const subscription = await this.getOrCreateSubscription(tenantId);
    const now = new Date();
    subscription.status = 'ACTIVE';
    subscription.selectedApps = sel.apps;
    subscription.branches = sel.branches;
    subscription.users = sel.users;
    subscription.amountMajor = sel.amount;
    subscription.currency = sel.currency;
    subscription.trialEndsAt = null;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = this.addMonths(now, 1);
    const saved = await this.subscriptionRepository.save(subscription);

    try {
      const enabled = expandDependencies(sel.apps);
      await this.ensureEnabledAppsColumn(sel.schemaName);
      const rows = await this.tenantDataSource.manager.query(
        `SELECT id FROM "${sel.schemaName}"."businesses" ORDER BY created_at ASC LIMIT 1`,
      );
      if (rows[0]) {
        await this.tenantDataSource.manager.query(
          `UPDATE "${sel.schemaName}"."businesses"
           SET enabled_apps = $1::jsonb, updated_at = now()
           WHERE id = $2`,
          [JSON.stringify(enabled), rows[0].id],
        );
      }
    } catch (error) {
      this.logger.error(
        `Activated subscription for ${tenantId} but failed to apply enabled_apps: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    return saved;
  }

  // ---------------------------------------------------------------------
  // Pricing config CRUD (super-admin) — LANDLORD-scoped. Guarded by
  // SuperAdminGuard on the /admin controller; this service assumes authorized.
  // ---------------------------------------------------------------------

  /**
   * The full pricing config for the super-admin editor: every app (with its
   * registry group/name) and its per-currency price, the usage unit prices, the
   * included allowance, and the list of currencies. Seeds on first read.
   */
  async getPricingAdmin() {
    const config = await this.loadPricingConfig();
    return {
      currencies: [...PRICING_CURRENCIES],
      includedBranches: config.included.branches,
      includedUsers: config.included.users,
      usagePrices: {
        branch: config.usagePrices.branch ?? {},
        user: config.usagePrices.user ?? {},
      },
      apps: APP_REGISTRY.map((app) => ({
        key: app.key,
        name: app.name,
        group: app.group,
        description: app.description,
        isAssist: isAssist(app.key),
        prices: config.appPrices[app.key] ?? {},
      })),
    };
  }

  /** True if v is a finite, non-negative number (rejects NaN/Infinity/negatives). */
  private isNonNegativeNumber(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0;
  }

  private assertKnownCurrency(currency: string): void {
    if (!(PRICING_CURRENCIES as readonly string[]).includes(currency)) {
      throw new BadRequestException(
        `Unknown currency '${currency}'. Allowed: ${PRICING_CURRENCIES.join(', ')}`,
      );
    }
  }

  /**
   * Validate a per-currency price map at the boundary: every key is a known
   * currency and every value is a finite, non-negative number. If
   * `mustBeZero` (assists), any non-zero price is rejected.
   */
  private validatePriceMap(
    label: string,
    map: Record<string, number>,
    mustBeZero = false,
  ): void {
    for (const [currency, value] of Object.entries(map)) {
      this.assertKnownCurrency(currency);
      if (!this.isNonNegativeNumber(value)) {
        throw new BadRequestException(
          `${label} price for ${currency} must be a non-negative number`,
        );
      }
      if (mustBeZero && value !== 0) {
        throw new BadRequestException(
          `${label} is an assist (add-on) and must stay free — its price must be 0`,
        );
      }
    }
  }

  /**
   * Update the platform pricing config (super-admin). Validates every write at
   * the boundary: known app keys, known currencies, non-negative prices, and
   * assists (ai, market) forced to stay 0. Only the provided maps/values change;
   * omitted apps/currencies keep their persisted value (partial merge).
   */
  async updatePricingConfig(input: UpdatePricingInput): Promise<PricingConfig> {
    await this.ensurePricingSeeded();
    const row = await this.pricingConfigRepository.findOne({
      where: { key: 'global' },
    });
    if (!row) {
      // Should never happen (ensurePricingSeeded just ran), but never write blind.
      throw new NotFoundException('Pricing config not found');
    }

    if (input.appPrices !== undefined) {
      const nextAppPrices = { ...row.appPrices };
      for (const [appKey, priceMap] of Object.entries(input.appPrices)) {
        const app = getApp(appKey);
        if (!app) {
          throw new BadRequestException(
            `Unknown app '${appKey}'. Allowed: ${APP_KEYS.join(', ')}`,
          );
        }
        this.validatePriceMap(app.name, priceMap, isAssist(appKey));
        nextAppPrices[appKey] = { ...(nextAppPrices[appKey] ?? {}), ...priceMap };
      }
      row.appPrices = nextAppPrices;
    }

    if (input.usagePrices !== undefined) {
      const nextUsage = {
        branch: { ...(row.usagePrices?.branch ?? {}) },
        user: { ...(row.usagePrices?.user ?? {}) },
      };
      if (input.usagePrices.branch !== undefined) {
        this.validatePriceMap('Branch', input.usagePrices.branch);
        nextUsage.branch = { ...nextUsage.branch, ...input.usagePrices.branch };
      }
      if (input.usagePrices.user !== undefined) {
        this.validatePriceMap('User', input.usagePrices.user);
        nextUsage.user = { ...nextUsage.user, ...input.usagePrices.user };
      }
      row.usagePrices = nextUsage;
    }

    if (input.includedBranches !== undefined) {
      if (
        !this.isNonNegativeNumber(input.includedBranches) ||
        !Number.isInteger(input.includedBranches)
      ) {
        throw new BadRequestException(
          'includedBranches must be a non-negative integer',
        );
      }
      row.includedBranches = input.includedBranches;
    }

    if (input.includedUsers !== undefined) {
      if (
        !this.isNonNegativeNumber(input.includedUsers) ||
        !Number.isInteger(input.includedUsers)
      ) {
        throw new BadRequestException(
          'includedUsers must be a non-negative integer',
        );
      }
      row.includedUsers = input.includedUsers;
    }

    return this.pricingConfigRepository.save(row);
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
      businessType: business.businessType,
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

      // Vertical exclusivity: nothing in the closure may clash with an app the
      // business already runs (e.g. enabling Restaurant while Inventory is on,
      // or enabling Marketplace — which pulls Inventory — on a restaurant).
      // These are separate business types; at most one per exclusiveGroup.
      const currentKeys = [...current];
      for (const k of closure) {
        const conflicts = exclusiveConflicts(k, currentKeys);
        if (conflicts.length > 0) {
          const names = conflicts.map((c) => getApp(c)?.name ?? c).join(', ');
          const trigger = getApp(k)?.name ?? k;
          throw new ConflictException(
            `${app.name} can't run alongside ${names} — ${trigger} and ${names} are separate business types. Disable ${names} first.`,
          );
        }
      }

      // Assists (AI, Marketplace) can't stand alone — they only work on top of
      // a vertical/common. Require at least one non-assist app after this change.
      if (isAssist(app.key)) {
        const willHaveHost = [...currentKeys, ...closure].some(
          (k) => !isAssist(k),
        );
        if (!willHaveHost) {
          throw new BadRequestException(
            `${app.name} is an add-on — enable a business app first, then turn on ${app.name}.`,
          );
        }
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

    // Return the SAME overview shape as getAppsOverview so callers (the tenant
    // Settings→Apps toggle and the admin tenant page) can refresh their app list
    // straight from the response. Previously this returned {enabledApps, ...}
    // with no `apps` array, so the UI's `Array.isArray(res.data.apps)` check
    // failed and showed a false "Could not update" error even though the write
    // succeeded (a refresh then showed the correct, already-updated state).
    const apps = APP_REGISTRY.map((appDef) => ({
      key: appDef.key,
      name: appDef.name,
      description: appDef.description,
      enabled: current.has(appDef.key),
      allowedByPlan: allowed.has(appDef.key),
      dependencies: appDef.dependencies,
      dependents: dependentsOf(appDef.key),
    }));

    return {
      businessType: business.businessType,
      apps,
      enabledApps,
      effective: enabledApps.filter((k) => allowed.has(k)),
      addedDependencies: alsoEnabled,
    };
  }

  // ---------------------------------------------------------------------
  // App access requests — LANDLORD-scoped (no tenant-schema migration).
  // A tenant user requests an app that is not effective; a tenant admin
  // approves (which enables it via setAppEnabled, respecting the plan) or
  // rejects it.
  // ---------------------------------------------------------------------

  /**
   * A tenant user requests access to an app.
   * - 400 if the appKey is unknown.
   * - 409 if the app is already effective for the tenant.
   * - Idempotent: if a PENDING request for the same app already exists, the
   *   existing request is returned instead of creating a duplicate.
   */
  async createAccessRequest(
    tenantId: string,
    schemaName: string,
    appKey: string,
    user: { sub?: string; email?: string } | undefined,
    note?: string | null,
  ): Promise<AppAccessRequest> {
    const app = getApp(appKey);
    if (!app) {
      throw new BadRequestException(`Unknown app '${appKey}'`);
    }

    const effective = await this.getEffectiveApps(tenantId, schemaName);
    if (effective.includes(app.key)) {
      throw new ConflictException(`${app.name} is already enabled for this business.`);
    }

    const existing = await this.accessRequestRepository.findOne({
      where: { tenantId, appKey: app.key, status: 'PENDING' },
    });
    if (existing) {
      return existing;
    }

    return this.accessRequestRepository.save(
      this.accessRequestRepository.create({
        tenantId,
        appKey: app.key,
        requestedByUserId: user?.sub ?? null,
        requestedByEmail: user?.email ?? null,
        note: note ?? null,
        status: 'PENDING',
      }),
    );
  }

  /** List a tenant's access requests, newest first, optionally by status. */
  async listAccessRequests(
    tenantId: string,
    status?: AccessRequestStatus,
  ): Promise<AppAccessRequest[]> {
    return this.accessRequestRepository.find({
      where: status ? { tenantId, status } : { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * List access requests across ALL tenants, newest first, optionally by
   * status. Intended only for the platform super-admin back-office — the
   * tenant-scoped listAccessRequests above remains the path for tenant admins.
   */
  async listAllAccessRequests(
    status?: AccessRequestStatus,
  ): Promise<AppAccessRequest[]> {
    return this.accessRequestRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Fetch a single access request by id (super-admin back-office): used to
   * resolve the owning tenant before reusing the tenant-scoped approve/reject
   * logic cross-tenant.
   */
  async getAccessRequestById(id: string): Promise<AppAccessRequest> {
    const request = await this.accessRequestRepository.findOne({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException('Access request not found');
    }
    return request;
  }

  private async getPendingAccessRequest(
    tenantId: string,
    id: string,
  ): Promise<AppAccessRequest> {
    const request = await this.accessRequestRepository.findOne({
      where: { id, tenantId },
    });
    if (!request) {
      throw new NotFoundException('Access request not found');
    }
    if (request.status !== 'PENDING') {
      throw new ConflictException(
        `Access request has already been ${request.status.toLowerCase()}.`,
      );
    }
    return request;
  }

  /**
   * Approve an access request and enable the app for the tenant.
   *
   * Plan handling (documented choice): if the requested app (or one of its
   * dependencies) is not allowed by the tenant's current plan, we do NOT
   * enable it and we leave the request PENDING, returning needsUpgrade:true
   * with a clear message. Leaving it PENDING (rather than marking it APPROVED)
   * means the admin can approve it again immediately after upgrading, without
   * the tenant re-requesting — the request stays actionable and its status
   * never lies about what actually happened.
   */
  async approveAccessRequest(
    tenantId: string,
    schemaName: string,
    id: string,
    adminUser: { sub?: string } | undefined,
  ): Promise<{
    request: AppAccessRequest;
    needsUpgrade: boolean;
    enabled?: Awaited<ReturnType<BillingService['setAppEnabled']>>;
    message?: string;
  }> {
    const request = await this.getPendingAccessRequest(tenantId, id);

    // Pre-check the plan so we can return a clean needsUpgrade response instead
    // of letting setAppEnabled throw a ForbiddenException.
    const subscription = await this.getOrCreateSubscription(tenantId);
    const allowed = new Set(this.appsAllowedByPlan(subscription));
    const closure = expandDependencies([request.appKey]);
    const planLocked = closure.filter((k) => !allowed.has(k));
    if (planLocked.length > 0) {
      const names = planLocked.map((k) => getApp(k)?.name ?? k).join(', ');
      const app = getApp(request.appKey);
      return {
        request,
        needsUpgrade: true,
        message: `${names} ${planLocked.length === 1 ? 'is' : 'are'} not included in your current plan. Upgrade to enable ${app?.name ?? request.appKey}, then approve this request.`,
      };
    }

    const enabled = await this.setAppEnabled(
      tenantId,
      schemaName,
      request.appKey,
      true,
    );

    request.status = 'APPROVED';
    request.resolvedAt = new Date();
    request.resolvedBy = adminUser?.sub ?? null;
    const saved = await this.accessRequestRepository.save(request);

    return { request: saved, needsUpgrade: false, enabled };
  }

  /** Reject an access request. Does not touch the tenant's enabled apps. */
  async rejectAccessRequest(
    tenantId: string,
    id: string,
    adminUser: { sub?: string } | undefined,
  ): Promise<AppAccessRequest> {
    const request = await this.getPendingAccessRequest(tenantId, id);
    request.status = 'REJECTED';
    request.resolvedAt = new Date();
    request.resolvedBy = adminUser?.sub ?? null;
    return this.accessRequestRepository.save(request);
  }
}
