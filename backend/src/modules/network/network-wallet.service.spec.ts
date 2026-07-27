import { BadRequestException } from '@nestjs/common';
import { NetworkWalletService } from './network-wallet.service';
import { NetworkWallet } from './entities/network-wallet.entity';
import { NetworkWalletEntry } from './entities/network-wallet-entry.entity';

/**
 * Money-path invariants for the wallet ledger:
 *  - a transfer debits the payer and credits the payee by the same rounded amount;
 *  - it is idempotent on `reference` (a repeat is a no-op, no double-credit);
 *  - it refuses non-positive amounts, self-transfers, and insufficient funds;
 *  - both wallet rows are locked FOR UPDATE before balances are touched.
 *
 * The service reads/locks wallets via a query-builder inside
 * walletRepo.manager.transaction(cb); the doubles below model that faithfully so
 * the assertions exercise the real code path, not a hollow stub.
 */
describe('NetworkWalletService.transfer', () => {
  let service: NetworkWalletService;
  let walletStore: Record<string, { tenantId: string; balance: number; currency: string }>;
  let entriesStore: Array<any>;
  let txWalletSave: jest.Mock;
  let txEntrySave: jest.Mock;
  let outerWalletRepo: any;

  const PAYER = 'tenant-payer';
  const PAYEE = 'tenant-payee';

  beforeEach(() => {
    walletStore = {
      [PAYER]: { tenantId: PAYER, balance: 100, currency: 'NGN' },
      [PAYEE]: { tenantId: PAYEE, balance: 0, currency: 'NGN' },
    };
    entriesStore = [];

    // Repo used INSIDE the transaction: locks a wallet row by tenantId.
    txWalletSave = jest.fn((w) => Promise.resolve(w));
    const txWalletRepo = {
      createQueryBuilder: jest.fn(() => {
        let params: any = {};
        const qb: any = {
          setLock: () => qb,
          where: (_c: string, p: any) => {
            params = p;
            return qb;
          },
          getOne: () => Promise.resolve(walletStore[params.tenantId] || null),
        };
        return qb;
      }),
      save: txWalletSave,
    };

    txEntrySave = jest.fn((rows) => {
      const arr = Array.isArray(rows) ? rows : [rows];
      entriesStore.push(...arr);
      return Promise.resolve(rows);
    });
    const txEntryRepo = {
      findOne: jest.fn(({ where }: any) =>
        Promise.resolve(
          entriesStore.find(
            (e) =>
              e.tenantId === where.tenantId &&
              e.reference === where.reference &&
              e.direction === where.direction,
          ) || null,
        ),
      ),
      create: jest.fn((d: any) => ({ ...d })),
      save: txEntrySave,
    };

    const em = {
      getRepository: (entity: any) =>
        entity === NetworkWallet ? txWalletRepo : txEntryRepo,
    };

    // Outer repo: getOrCreate reads wallets; manager.transaction runs the cb.
    outerWalletRepo = {
      findOne: jest.fn(({ where }: any) => Promise.resolve(walletStore[where.tenantId] || null)),
      create: jest.fn((d: any) => ({ ...d })),
      save: jest.fn((w: any) => Promise.resolve(w)),
      manager: {
        transaction: jest.fn((cb: any) => cb(em)),
        query: jest.fn().mockResolvedValue(undefined),
      },
    };

    const entryRepo = { manager: { query: jest.fn() } };
    const landlordService = {
      findTenantById: jest.fn().mockResolvedValue({ currency: 'NGN' }),
    };

    service = new NetworkWalletService(
      outerWalletRepo as any,
      entryRepo as any,
      landlordService as any,
    );
  });

  it('rejects a non-positive amount', async () => {
    await expect(
      service.transfer({ payerTenantId: PAYER, payeeTenantId: PAYEE, amount: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a self-transfer', async () => {
    await expect(
      service.transfer({ payerTenantId: PAYER, payeeTenantId: PAYER, amount: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the payer has insufficient funds', async () => {
    await expect(
      service.transfer({ payerTenantId: PAYER, payeeTenantId: PAYEE, amount: 250 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(walletStore[PAYER].balance).toBe(100); // unchanged
    expect(walletStore[PAYEE].balance).toBe(0);
  });

  it('debits payer and credits payee, writing one debit + one credit entry', async () => {
    await service.transfer({
      payerTenantId: PAYER,
      payeeTenantId: PAYEE,
      amount: 30,
      reference: 'order:abc',
    });

    expect(walletStore[PAYER].balance).toBe(70);
    expect(walletStore[PAYEE].balance).toBe(30);
    // One save call carrying both wallet rows.
    expect(txWalletSave).toHaveBeenCalledTimes(1);
    const debit = entriesStore.find((e) => e.direction === 'debit');
    const credit = entriesStore.find((e) => e.direction === 'credit');
    expect(debit).toMatchObject({ tenantId: PAYER, amount: 30, reference: 'order:abc' });
    expect(credit).toMatchObject({ tenantId: PAYEE, amount: 30, reference: 'order:abc' });
  });

  it('is idempotent on reference — a repeat does not double-apply', async () => {
    // Seed the prior debit as if the first transfer already ran.
    entriesStore.push({ tenantId: PAYER, reference: 'order:abc', direction: 'debit', amount: 30 });

    const result = await service.transfer({
      payerTenantId: PAYER,
      payeeTenantId: PAYEE,
      amount: 30,
      reference: 'order:abc',
    });

    // No balances moved, no new entries written on the repeat.
    expect(walletStore[PAYER].balance).toBe(100);
    expect(walletStore[PAYEE].balance).toBe(0);
    expect(txWalletSave).not.toHaveBeenCalled();
    expect(txEntrySave).not.toHaveBeenCalled();
    expect(result.tenantId).toBe(PAYER);
  });

  it('rounds the transferred amount to 2 decimal places', async () => {
    await service.transfer({
      payerTenantId: PAYER,
      payeeTenantId: PAYEE,
      amount: 10.005,
      reference: 'order:round',
    });
    const debit = entriesStore.find((e) => e.direction === 'debit');
    expect(debit.amount).toBe(10.01);
    expect(walletStore[PAYER].balance).toBe(89.99);
  });
});
