import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { NetworkWallet } from './entities/network-wallet.entity';
import { NetworkWalletEntry } from './entities/network-wallet-entry.entity';
import { LandlordService } from '../../common/landlord/services/landlord.service';

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Raised when a concurrent duplicate transfer trips the unique index. */
class DuplicateTransferError extends Error {}

export interface TransferInput {
  payerTenantId: string;
  payeeTenantId: string;
  amount: number;
  reference?: string;
  note?: string;
  payerName?: string;
  payeeName?: string;
}

/**
 * Kuza Network wallet (Phase 3) — an IOU ledger (no held float). A "pay a
 * supplier" is an atomic internal transfer: debit the payer, credit the payee,
 * with an append-only ledger row on each side. Balances are signed (a payer
 * with no funds goes negative). Real money enters/leaves only at top-up /
 * withdrawal (a later phase). All mutations run inside a single landlord-
 * connection transaction; transfers are idempotent on `reference`.
 */
@Injectable()
export class NetworkWalletService implements OnModuleInit {
  private readonly logger = new Logger(NetworkWalletService.name);

  constructor(
    @InjectRepository(NetworkWallet, 'landlord')
    private readonly walletRepo: Repository<NetworkWallet>,
    @InjectRepository(NetworkWalletEntry, 'landlord')
    private readonly entryRepo: Repository<NetworkWalletEntry>,
    private readonly landlordService: LandlordService,
  ) {}

  /**
   * DB-level invariants for the wallet ledger (TypeORM synchronize doesn't
   * reliably add checks / partial unique indexes to existing tables). Both are
   * idempotent — added once, then a no-op on every boot. These also belong in
   * the baseline migration; this keeps existing environments correct.
   *
   *  - Non-negative balance CHECK: a wallet can never go below zero.
   *  - Partial unique index on (tenant_id, reference, direction): the hard
   *    backstop for transfer idempotency — a repeated reference can produce at
   *    most one debit row for a payer (and one credit for a payee), so a raced
   *    or retried transfer cannot double-apply even if the pre-check misses.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.walletRepo.manager.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'chk_network_wallets_balance_nonneg'
              AND conrelid = 'network_wallets'::regclass
          ) THEN
            ALTER TABLE network_wallets
              ADD CONSTRAINT chk_network_wallets_balance_nonneg CHECK (balance >= 0);
          END IF;
        END $$;
      `);
    } catch (error) {
      this.logger.error(
        `Could not ensure wallet non-negative CHECK constraint: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    try {
      await this.walletRepo.manager.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_network_wallet_entries_ref_dir
          ON network_wallet_entries (tenant_id, reference, direction)
          WHERE reference IS NOT NULL;
      `);
    } catch (error) {
      this.logger.error(
        `Could not ensure wallet-entry idempotency index: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  async getOrCreate(tenantId: string): Promise<NetworkWallet> {
    const existing = await this.walletRepo.findOne({ where: { tenantId } });
    if (existing) return existing;
    const tenant = await this.landlordService.findTenantById(tenantId);
    return this.walletRepo.save(
      this.walletRepo.create({ tenantId, balance: 0, currency: tenant.currency || 'NGN' }),
    );
  }

  /** Wallet + recent ledger entries (newest first). */
  async getWallet(tenantId: string): Promise<any> {
    const wallet = await this.getOrCreate(tenantId);
    const entries = await this.entryRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return { ...wallet, entries };
  }

  /** Lock a tenant's wallet row FOR UPDATE (the row must already exist). */
  private lockWallet(em: EntityManager, tenantId: string): Promise<NetworkWallet | null> {
    return em
      .getRepository(NetworkWallet)
      .createQueryBuilder('w')
      .setLock('pessimistic_write')
      .where('w.tenantId = :tenantId', { tenantId })
      .getOne();
  }

  /**
   * Atomic internal transfer: debit payer, credit payee, one ledger row each.
   * Idempotent on `reference` (a repeat is a no-op and returns the payer wallet
   * unchanged). Returns the updated payer wallet.
   *
   * Concurrency-safe: both wallet rows are locked FOR UPDATE (in a deterministic
   * order to avoid deadlocks) before any balance is read or written, so racing
   * transfers serialize instead of losing updates. A partial unique index on
   * (tenant_id, reference, direction) is the hard backstop against a raced
   * duplicate slipping past the in-transaction idempotency check.
   */
  async transfer(input: TransferInput): Promise<NetworkWallet> {
    const amount = round2(Number(input.amount));
    if (!(amount > 0)) throw new BadRequestException('Amount must be greater than 0');
    if (input.payerTenantId === input.payeeTenantId) {
      throw new BadRequestException('Payer and payee cannot be the same');
    }

    // Ensure both wallet rows exist before the transaction — a row can't be
    // locked FOR UPDATE until it exists.
    await this.getOrCreate(input.payerTenantId);
    await this.getOrCreate(input.payeeTenantId);

    try {
      return await this.runTransfer(input, amount);
    } catch (err) {
      // A raced duplicate already applied this transfer — idempotent success.
      if (err instanceof DuplicateTransferError) {
        return this.getOrCreate(input.payerTenantId);
      }
      throw err;
    }
  }

  private runTransfer(input: TransferInput, amount: number): Promise<NetworkWallet> {
    return this.walletRepo.manager.transaction(async (em) => {
      const walletRepo = em.getRepository(NetworkWallet);
      const entries = em.getRepository(NetworkWalletEntry);

      // Lock BOTH wallet rows in a fixed (sorted) order to prevent deadlocks
      // between mirror-image transfers (A→B vs B→A).
      const sortedIds = [input.payerTenantId, input.payeeTenantId].sort();
      const locked: Record<string, NetworkWallet> = {};
      for (const id of sortedIds) {
        const w = await this.lockWallet(em, id);
        if (!w) throw new BadRequestException('Wallet not found');
        locked[id] = w;
      }
      const payer = locked[input.payerTenantId];
      const payee = locked[input.payeeTenantId];

      // Idempotency (re-checked under lock): a repeat reference is a no-op.
      if (input.reference) {
        const dup = await entries.findOne({
          where: { tenantId: input.payerTenantId, reference: input.reference, direction: 'debit' },
        });
        if (dup) return payer;
      }

      // Wallets never go negative — the payer must already hold the funds.
      if (Number(payer.balance) < amount) {
        throw new BadRequestException(
          'Insufficient wallet balance. Top up your wallet or mark the order as paid externally.',
        );
      }

      payer.balance = round2(Number(payer.balance) - amount);
      payee.balance = round2(Number(payee.balance) + amount);
      await walletRepo.save([payer, payee]);

      try {
        await entries.save([
          entries.create({
            tenantId: payer.tenantId,
            direction: 'debit',
            amount,
            balanceAfter: payer.balance,
            type: 'transfer',
            counterpartyTenantId: payee.tenantId,
            counterpartyName: input.payeeName ?? null,
            reference: input.reference ?? null,
            note: input.note ?? null,
          }),
          entries.create({
            tenantId: payee.tenantId,
            direction: 'credit',
            amount,
            balanceAfter: payee.balance,
            type: 'transfer',
            counterpartyTenantId: payer.tenantId,
            counterpartyName: input.payerName ?? null,
            reference: input.reference ?? null,
            note: input.note ?? null,
          }),
        ]);
      } catch (err) {
        // Unique-index backstop: a concurrent duplicate (same reference) already
        // applied this transfer. Roll back this txn and signal idempotent success.
        if ((err as { code?: string })?.code === '23505') {
          throw new DuplicateTransferError();
        }
        throw err;
      }

      return payer;
    });
  }
}
