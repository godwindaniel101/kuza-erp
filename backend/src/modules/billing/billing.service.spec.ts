import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { Plan } from './entities/plan.entity';
import { createMockRepo, MockRepo } from '../../../test/repo-mock';

/**
 * Revenue-protection + module-isolation invariants for the billing service:
 *
 *  - changePlan is the self-service switch. A PAID plan can ONLY be activated
 *    with opts.allowPaid (the verified post-payment / super-admin path); a
 *    direct switch to a paid plan must be refused so a tenant cannot unlock a
 *    paid plan's gated apps without paying.
 *  - getEffectiveApps enforces module isolation: effective apps are the
 *    intersection of what the business enabled and what the plan allows, with a
 *    TRIALING subscription allowing every app (still respecting enabledApps).
 *
 * All repos/datasource are mocked — no real DB. getTenantCurrency reads
 * `businesses.currency` via userRepository.query; getBusinessAppsRow reads the
 * business row via the tenant DataSource's manager.query (schema-qualified SQL).
 */
describe('BillingService', () => {
  let service: BillingService;
  let planRepo: MockRepo;
  let subRepo: MockRepo;
  let payRepo: MockRepo;
  let accessRepo: MockRepo;
  let pricingRepo: MockRepo;
  let userRepo: MockRepo;
  let branchRepo: MockRepo;
  let itemRepo: MockRepo;
  let configService: { get: jest.Mock };
  let paystackAdapter: Record<string, jest.Mock>;
  let tenantManagerQuery: jest.Mock;

  const TENANT = 'tenant-1';
  const SCHEMA = 'tenant_1';
  const PLAN_COUNT = 3;

  /** Build a Plan with just the fields the money-path helpers read. */
  const makePlan = (over: Partial<Plan> & { id: string; code: string }): Plan =>
    ({
      name: over.code,
      description: '',
      isActive: true,
      monthlyPriceUsd: 0,
      prices: null,
      limits: { maxUsers: -1, maxBranches: -1, maxItems: -1, modules: [] },
      ...over,
    }) as Plan;

  // FREE / zero-price and a genuinely PAID plan (NGN 45000).
  const FREE = makePlan({
    id: 'plan-free',
    code: 'FREE',
    monthlyPriceUsd: 0,
    prices: { NGN: 0, USD: 0 },
    limits: { maxUsers: 3, maxBranches: 1, maxItems: 100, modules: ['ims', 'rms'] },
  });
  const STARTER = makePlan({
    id: 'plan-starter',
    code: 'STARTER',
    monthlyPriceUsd: 29,
    prices: { NGN: 45000, USD: 29 },
    limits: { maxUsers: 10, maxBranches: 3, maxItems: 1000, modules: ['ims', 'rms', 'hrms'] },
  });
  const GROWTH = makePlan({
    id: 'plan-growth',
    code: 'GROWTH',
    monthlyPriceUsd: 99,
    prices: { NGN: 150000, USD: 99 },
    limits: {
      maxUsers: 50,
      maxBranches: 10,
      maxItems: -1,
      modules: ['ims', 'rms', 'hrms', 'accounting', 'invoicing'],
    },
  });

  const plansById: Record<string, Plan> = {
    [FREE.id]: FREE,
    [STARTER.id]: STARTER,
    [GROWTH.id]: GROWTH,
  };
  const plansByCode: Record<string, Plan> = {
    FREE,
    STARTER,
    GROWTH,
  };

  /** An existing ACTIVE subscription so getOrCreateSubscription is a no-op read. */
  const makeActiveSub = (plan: Plan) => ({
    id: 'sub-1',
    tenantId: TENANT,
    planId: plan.id,
    plan,
    status: 'ACTIVE' as const,
    trialEndsAt: null as Date | null,
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: new Date('2026-02-01'),
  });

  /** Configure the tenant DataSource so getBusinessAppsRow returns `row`. */
  const wireBusinessRow = (enabledApps: string[] | null) => {
    tenantManagerQuery.mockImplementation((sql: string) => {
      // ensureEnabledAppsColumn probe — return a non-empty row so no ALTER runs.
      if (typeof sql === 'string' && sql.includes('information_schema')) {
        return Promise.resolve([{ exists: 1 }]);
      }
      // getBusinessAppsRow — the single business row.
      return Promise.resolve([
        {
          id: 'biz-1',
          enabled_apps: enabledApps,
          business_type: 'retail',
        },
      ]);
    });
  };

  beforeEach(() => {
    planRepo = createMockRepo();
    subRepo = createMockRepo();
    payRepo = createMockRepo();
    accessRepo = createMockRepo();
    pricingRepo = createMockRepo();
    userRepo = createMockRepo();
    branchRepo = createMockRepo();
    itemRepo = createMockRepo();
    configService = { get: jest.fn().mockReturnValue(undefined) };
    paystackAdapter = {
      initializeTransaction: jest.fn(),
      parseWebhook: jest.fn(),
    };
    tenantManagerQuery = jest.fn().mockResolvedValue([]);

    // Plans are already seeded (count > 0) with no unpriced rows to backfill.
    planRepo.count.mockResolvedValue(PLAN_COUNT);
    planRepo.find.mockResolvedValue([]);
    planRepo.findOne.mockImplementation(({ where }: any) => {
      if (where?.id) return Promise.resolve(plansById[where.id] ?? null);
      if (where?.code) return Promise.resolve(plansByCode[where.code] ?? null);
      return Promise.resolve(null);
    });

    // getTenantCurrency → businesses.currency (NGN, where the paid plans price).
    userRepo.query.mockResolvedValue([{ currency: 'NGN' }]);

    const dataSource = { manager: { query: tenantManagerQuery } };

    service = new BillingService(
      planRepo as any,
      subRepo as any,
      payRepo as any,
      accessRepo as any,
      pricingRepo as any,
      configService as any,
      paystackAdapter as any,
      userRepo as any,
      branchRepo as any,
      itemRepo as any,
      dataSource as any,
    );
  });

  // -------------------------------------------------------------------------
  // changePlan — the revenue guard
  // -------------------------------------------------------------------------
  describe('changePlan revenue guard', () => {
    it('refuses a direct switch to a PAID plan (no allowPaid) and saves nothing', async () => {
      // Arrange: tenant currently on FREE.
      subRepo.findOne.mockResolvedValue(makeActiveSub(FREE));

      // Act / Assert: switching to a paid plan is blocked ("start a checkout").
      await expect(service.changePlan(TENANT, 'STARTER')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      // The subscription must NOT have been persisted onto the paid plan.
      expect(subRepo.save).not.toHaveBeenCalled();
    });

    it('allows switching to a FREE / zero-price plan → ACTIVE on that plan', async () => {
      // Arrange: tenant currently on GROWTH.
      subRepo.findOne.mockResolvedValue(makeActiveSub(GROWTH));
      subRepo.save.mockImplementation((s: any) => Promise.resolve(s));

      // Act
      const result = await service.changePlan(TENANT, 'FREE');

      // Assert
      expect(subRepo.save).toHaveBeenCalledTimes(1);
      expect(result.planId).toBe(FREE.id);
      expect(result.plan).toBe(FREE);
      expect(result.status).toBe('ACTIVE');
      expect(result.trialEndsAt).toBeNull();
    });

    it('allows a PAID plan when allowPaid=true (webhook / super-admin path) → ACTIVE', async () => {
      // Arrange: tenant currently on FREE.
      subRepo.findOne.mockResolvedValue(makeActiveSub(FREE));
      subRepo.save.mockImplementation((s: any) => Promise.resolve(s));

      // Act: the verified post-payment activation path.
      const result = await service.changePlan(TENANT, 'STARTER', {
        allowPaid: true,
      });

      // Assert
      expect(subRepo.save).toHaveBeenCalledTimes(1);
      expect(result.planId).toBe(STARTER.id);
      expect(result.status).toBe('ACTIVE');
    });
  });

  // -------------------------------------------------------------------------
  // getEffectiveApps — module isolation (business.enabledApps ∩ plan-allowed)
  // -------------------------------------------------------------------------
  describe('getEffectiveApps module isolation', () => {
    it('returns the intersection, excluding a plan-disallowed app the business enabled', async () => {
      // Arrange: ACTIVE plan allows only ims(→items) + invoicing.
      const plan = makePlan({
        id: 'plan-subset',
        code: 'ENTERPRISE',
        prices: { NGN: 0 },
        limits: { maxUsers: 1, maxBranches: 1, maxItems: 1, modules: ['ims', 'invoicing'] },
      });
      plansById[plan.id] = plan;
      subRepo.findOne.mockResolvedValue(makeActiveSub(plan));
      // Business enabled items, rms and invoicing — but rms is NOT plan-allowed.
      wireBusinessRow(['items', 'rms', 'invoicing']);

      // Act
      const effective = await service.getEffectiveApps(TENANT, SCHEMA);

      // Assert: intersection only — rms is excluded despite being enabled.
      expect(effective).toEqual(['items', 'invoicing']);
      expect(effective).not.toContain('rms');
    });

    it('TRIALING allows every app, still respecting the business enabledApps', async () => {
      // Arrange: a TRIALING subscription (trial not yet expired).
      const trialing = {
        ...makeActiveSub(GROWTH),
        status: 'TRIALING' as const,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      subRepo.findOne.mockResolvedValue(trialing);
      // Business enabled only a subset; 'people' is deliberately left off.
      wireBusinessRow(['items', 'books']);

      // Act
      const effective = await service.getEffectiveApps(TENANT, SCHEMA);

      // Assert: trial allows all apps, so the result is exactly what the
      // business enabled — and nothing it did not enable.
      expect(effective).toEqual(['items', 'books']);
      expect(effective).not.toContain('people');
    });
  });
});
