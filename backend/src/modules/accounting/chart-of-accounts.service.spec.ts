import { BadRequestException } from '@nestjs/common';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { DEFAULT_CHART } from './accounting.constants';
import { normalBalanceForType } from './entities/account.entity';
import { createMockRepo, MockRepo } from '../../../test/repo-mock';

/**
 * Invariants: seeding the default chart produces exactly the expected accounts
 * with the correct normal balance per type, seeding is idempotent, and system /
 * in-use accounts cannot be deleted.
 */
describe('ChartOfAccountsService', () => {
  let service: ChartOfAccountsService;
  let accountRepo: MockRepo;
  let lineRepo: MockRepo;

  beforeEach(() => {
    accountRepo = createMockRepo();
    lineRepo = createMockRepo();
    service = new ChartOfAccountsService(accountRepo as any, lineRepo as any);
  });

  describe('normalBalanceForType (pure)', () => {
    it('ASSET and EXPENSE are debit-normal', () => {
      expect(normalBalanceForType('ASSET')).toBe('DEBIT');
      expect(normalBalanceForType('EXPENSE')).toBe('DEBIT');
    });
    it('LIABILITY, EQUITY and INCOME are credit-normal', () => {
      expect(normalBalanceForType('LIABILITY')).toBe('CREDIT');
      expect(normalBalanceForType('EQUITY')).toBe('CREDIT');
      expect(normalBalanceForType('INCOME')).toBe('CREDIT');
    });
  });

  describe('seedDefaults', () => {
    it('seeds the full default chart with correct codes, types and normal balances', async () => {
      // Arrange: tenant has no accounts yet.
      accountRepo.count.mockResolvedValue(0);
      // Act
      await service.seedDefaults();
      // Assert
      const seeded = accountRepo.save.mock.calls[0][0] as any[];
      expect(seeded).toHaveLength(DEFAULT_CHART.length);

      const byCode = Object.fromEntries(seeded.map((a) => [a.code, a]));
      for (const def of DEFAULT_CHART) {
        const acc = byCode[def.code];
        expect(acc).toBeDefined();
        expect(acc.type).toBe(def.type);
        // Normal balance must be derived from type, never hand-set incorrectly.
        expect(acc.normalBalance).toBe(normalBalanceForType(def.type));
        expect(acc.isSystem).toBe(true);
        expect(acc.isActive).toBe(true);
      }
    });

    it('spot-checks representative accounts (Cash=DEBIT, Sales Revenue=CREDIT, AP=CREDIT)', async () => {
      accountRepo.count.mockResolvedValue(0);
      await service.seedDefaults();
      const byCode = Object.fromEntries(
        (accountRepo.save.mock.calls[0][0] as any[]).map((a) => [a.code, a]),
      );
      expect(byCode['1000'].normalBalance).toBe('DEBIT'); // Cash on Hand (ASSET)
      expect(byCode['4000'].normalBalance).toBe('CREDIT'); // Sales Revenue (INCOME)
      expect(byCode['2000'].normalBalance).toBe('CREDIT'); // Accounts Payable (LIABILITY)
      expect(byCode['5000'].normalBalance).toBe('DEBIT'); // COGS (EXPENSE)
    });

    it('is idempotent: does not re-seed when accounts already exist', async () => {
      // Arrange: chart already present.
      accountRepo.count.mockResolvedValue(DEFAULT_CHART.length);
      accountRepo.find.mockResolvedValue([]);
      // Act
      await service.seedDefaults();
      // Assert: nothing new saved.
      expect(accountRepo.save).not.toHaveBeenCalled();
      expect(accountRepo.find).toHaveBeenCalled();
    });
  });

  describe('ensureSeeded', () => {
    it('seeds only when the tenant has zero accounts', async () => {
      accountRepo.count.mockResolvedValue(0);
      const seedSpy = jest.spyOn(service, 'seedDefaults').mockResolvedValue([]);
      await service.ensureSeeded();
      expect(seedSpy).toHaveBeenCalledTimes(1);
    });

    it('does not seed when accounts already exist', async () => {
      accountRepo.count.mockResolvedValue(1);
      const seedSpy = jest.spyOn(service, 'seedDefaults').mockResolvedValue([]);
      await service.ensureSeeded();
      expect(seedSpy).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('refuses to delete a system account', async () => {
      accountRepo.findOne.mockResolvedValue({ id: 'a1', isSystem: true });
      await expect(service.remove('a1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(accountRepo.remove).not.toHaveBeenCalled();
    });

    it('refuses to delete an account that has journal lines', async () => {
      accountRepo.findOne.mockResolvedValue({ id: 'a1', isSystem: false });
      lineRepo.count.mockResolvedValue(3); // in use
      await expect(service.remove('a1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(accountRepo.remove).not.toHaveBeenCalled();
    });

    it('refuses to delete an account that has children', async () => {
      accountRepo.findOne.mockResolvedValue({ id: 'a1', isSystem: false });
      lineRepo.count.mockResolvedValue(0);
      accountRepo.count.mockResolvedValue(2); // has children
      await expect(service.remove('a1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(accountRepo.remove).not.toHaveBeenCalled();
    });

    it('deletes a non-system, unused, childless account', async () => {
      const account = { id: 'a1', isSystem: false };
      accountRepo.findOne.mockResolvedValue(account);
      lineRepo.count.mockResolvedValue(0);
      accountRepo.count.mockResolvedValue(0);
      await service.remove('a1');
      expect(accountRepo.remove).toHaveBeenCalledWith(account);
    });
  });
});
