import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PostingService } from './posting.service';
import { ACCOUNT_CODES, DEFAULT_CHART, toCents } from './accounting.constants';
import { normalBalanceForType } from './entities/account.entity';
import { createMockRepo, MockRepo } from '../../../test/repo-mock';

/**
 * Money-path invariants for the double-entry posting engine:
 *  - every persisted entry is balanced (Σdebits === Σcredits in integer cents);
 *  - posting is idempotent per (sourceType, sourceId);
 *  - posted entries are never mutated — corrections happen via a mirrored reversal.
 */
describe('PostingService', () => {
  let service: PostingService;
  let jeRepo: MockRepo;
  let lineRepo: MockRepo;
  let accountRepo: MockRepo;
  let chart: { ensureSeeded: jest.Mock };

  /** Full seeded chart so any account code resolves during posting. */
  const allAccounts = DEFAULT_CHART.map((def) => ({
    id: `acc-${def.code}`,
    code: def.code,
    name: def.name,
    type: def.type,
    normalBalance: normalBalanceForType(def.type),
    isActive: true,
  }));

  /** Sum a set of persisted journal lines and return {debit,credit} in cents. */
  const sumCents = (lines: Array<{ debit: string; credit: string }>) =>
    lines.reduce(
      (acc, l) => ({
        debit: acc.debit + toCents(l.debit),
        credit: acc.credit + toCents(l.credit),
      }),
      { debit: 0, credit: 0 },
    );

  beforeEach(() => {
    jeRepo = createMockRepo();
    lineRepo = createMockRepo();
    accountRepo = createMockRepo();
    chart = { ensureSeeded: jest.fn().mockResolvedValue(undefined) };

    // Any account code / id resolves to the seeded chart.
    accountRepo.find.mockResolvedValue(allAccounts);

    service = new PostingService(
      jeRepo as any,
      lineRepo as any,
      accountRepo as any,
      chart as any,
    );
  });

  // -------------------------------------------------------------------------
  // validateLines — the shared balance gate
  // -------------------------------------------------------------------------
  describe('validateLines', () => {
    it('accepts a balanced set and returns amounts normalised to numbers', () => {
      // Arrange
      const lines = [
        { debit: 100, credit: 0 },
        { debit: 0, credit: 100 },
      ];
      // Act
      const result = service.validateLines(lines);
      // Assert
      expect(result).toEqual([
        { debit: 100, credit: 0 },
        { debit: 0, credit: 100 },
      ]);
    });

    it('balances using integer cents (no float drift)', () => {
      // Arrange: 10.10 + 20.20 === 30.30
      const lines = [
        { debit: 10.1, credit: 0 },
        { debit: 20.2, credit: 0 },
        { debit: 0, credit: 30.3 },
      ];
      // Act / Assert
      expect(() => service.validateLines(lines)).not.toThrow();
    });

    it('rejects an unbalanced entry (off by one cent)', () => {
      // Arrange
      const lines = [
        { debit: 10.0, credit: 0 },
        { debit: 0, credit: 10.01 },
      ];
      // Act / Assert
      expect(() => service.validateLines(lines)).toThrow(BadRequestException);
    });

    it('rejects an empty entry', () => {
      expect(() => service.validateLines([])).toThrow(BadRequestException);
    });

    it('rejects a line carrying both a debit and a credit', () => {
      const lines = [
        { debit: 50, credit: 50 },
        { debit: 0, credit: 50 },
        { debit: 50, credit: 0 },
      ];
      expect(() => service.validateLines(lines)).toThrow(BadRequestException);
    });

    it('rejects negative amounts', () => {
      const lines = [
        { debit: -100, credit: 0 },
        { debit: 0, credit: -100 },
      ];
      expect(() => service.validateLines(lines)).toThrow(BadRequestException);
    });

    it('rejects a zero-total entry', () => {
      const lines = [
        { debit: 0, credit: 0 },
        { debit: 0, credit: 0 },
      ];
      expect(() => service.validateLines(lines)).toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // postEntry — persistence, balance, idempotency
  // -------------------------------------------------------------------------
  describe('postEntry', () => {
    /** Wire jeRepo/lineRepo so postEntry can save then re-load the entry. */
    function wirePersistence() {
      let savedEntry: any = null;
      let savedLines: any[] = [];
      jeRepo.save.mockImplementation((e: any) => {
        if (!e.id) e.id = 'je-1';
        savedEntry = e;
        return Promise.resolve(e);
      });
      jeRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id) return Promise.resolve(savedEntry);
        return Promise.resolve(null); // idempotency probe: nothing exists yet
      });
      lineRepo.save.mockImplementation((lines: any[]) => {
        savedLines = lines;
        return Promise.resolve(lines);
      });
      lineRepo.find.mockImplementation(() => Promise.resolve(savedLines));
      return () => savedLines;
    }

    it('persists a balanced POSTED entry (Σdebits === Σcredits in cents)', async () => {
      // Arrange
      wirePersistence();
      // Act
      await service.postEntry({
        sourceType: 'order',
        sourceId: 'ord-1',
        lines: [
          { accountCode: ACCOUNT_CODES.CASH_ON_HAND, debit: 107.5 },
          { accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: 100 },
          { accountCode: ACCOUNT_CODES.TAX_PAYABLE, credit: 7.5 },
        ],
      });
      // Assert
      const persisted = lineRepo.save.mock.calls[0][0];
      const totals = sumCents(persisted);
      expect(totals.debit).toBe(totals.credit);
      expect(totals.debit).toBe(10750);
      const header = jeRepo.save.mock.calls[0][0];
      expect(header.status).toBe('POSTED');
      expect(header.postedAt).toBeInstanceOf(Date);
    });

    it('leaves a DRAFT when autoPost is false', async () => {
      // Arrange
      wirePersistence();
      // Act
      await service.postEntry({
        autoPost: false,
        lines: [
          { accountCode: ACCOUNT_CODES.CASH_ON_HAND, debit: 10 },
          { accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: 10 },
        ],
      });
      // Assert
      const header = jeRepo.save.mock.calls[0][0];
      expect(header.status).toBe('DRAFT');
      expect(header.postedAt).toBeNull();
    });

    it('is idempotent per (sourceType, sourceId): returns the existing entry, writes nothing', async () => {
      // Arrange
      const existing = { id: 'je-existing', status: 'POSTED' };
      jeRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.sourceType) return Promise.resolve(existing);
        if (where?.id === 'je-existing') return Promise.resolve(existing);
        return Promise.resolve(null);
      });
      lineRepo.find.mockResolvedValue([]);
      // Act
      const result = await service.postEntry({
        sourceType: 'order',
        sourceId: 'ord-1',
        lines: [
          { accountCode: ACCOUNT_CODES.CASH_ON_HAND, debit: 10 },
          { accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: 10 },
        ],
      });
      // Assert: no new header/lines written, existing entry returned.
      expect(result.id).toBe('je-existing');
      expect(jeRepo.save).not.toHaveBeenCalled();
      expect(lineRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an unbalanced entry before any write', async () => {
      // Arrange
      wirePersistence();
      // Act / Assert
      await expect(
        service.postEntry({
          lines: [
            { accountCode: ACCOUNT_CODES.CASH_ON_HAND, debit: 10 },
            { accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: 9 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(jeRepo.save).not.toHaveBeenCalled();
    });

    it('rejects sourceType without sourceId (partial event identity)', async () => {
      await expect(
        service.postEntry({
          sourceType: 'order',
          lines: [
            { accountCode: ACCOUNT_CODES.CASH_ON_HAND, debit: 10 },
            { accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: 10 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown account code', async () => {
      // Arrange
      wirePersistence();
      accountRepo.find.mockResolvedValue([]); // nothing resolves
      // Act / Assert
      await expect(
        service.postEntry({
          lines: [
            { accountCode: '9999', debit: 10 },
            { accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: 10 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // reverse — the only sanctioned correction path for a POSTED entry
  // -------------------------------------------------------------------------
  describe('reverse', () => {
    it('mirrors debits/credits, marks the original REVERSED and links the reversal', async () => {
      // Arrange
      const original: any = {
        id: 'orig',
        status: 'POSTED',
        entryNumber: 'JE-000001',
        memo: 'Sale',
      };
      let reversalSaved: any = null;
      jeRepo.save.mockImplementation((e: any) => {
        if (e.sourceType === 'reversal') {
          if (!e.id) e.id = 'rev-1';
          reversalSaved = e;
        }
        return Promise.resolve(e);
      });
      jeRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'orig') return Promise.resolve(original);
        if (where?.id === 'rev-1') return Promise.resolve(reversalSaved);
        return Promise.resolve(null);
      });
      const origLines = [
        { accountId: 'acc-a', debit: '100.00', credit: '0.00', description: 'x' },
        { accountId: 'acc-b', debit: '0.00', credit: '100.00', description: 'y' },
      ];
      let reversalLines: any[] = [];
      lineRepo.save.mockImplementation((lines: any[]) => {
        reversalLines = lines;
        return Promise.resolve(lines);
      });
      lineRepo.find.mockImplementation(({ where }: any) => {
        if (where?.journalEntryId === 'orig') return Promise.resolve(origLines);
        return Promise.resolve(reversalLines);
      });

      // Act
      await service.reverse('orig', 'user-1');

      // Assert: lines are mirrored (debit <-> credit).
      expect(reversalLines[0]).toMatchObject({
        accountId: 'acc-a',
        debit: '0.00',
        credit: '100.00',
      });
      expect(reversalLines[1]).toMatchObject({
        accountId: 'acc-b',
        debit: '100.00',
        credit: '0.00',
      });
      // Reversal is itself balanced.
      const totals = sumCents(reversalLines);
      expect(totals.debit).toBe(totals.credit);
      // Original is marked REVERSED and linked — never edited in place.
      expect(original.status).toBe('REVERSED');
      expect(original.reversedByEntryId).toBe('rev-1');
    });

    it('refuses to reverse a non-POSTED entry', async () => {
      // Arrange
      jeRepo.findOne.mockResolvedValue({ id: 'orig', status: 'DRAFT' });
      // Act / Assert
      await expect(service.reverse('orig')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws NotFound when the entry does not exist', async () => {
      jeRepo.findOne.mockResolvedValue(null);
      await expect(service.reverse('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('exposes no in-place update path (corrections are reversal-only)', () => {
      // Structural invariant: an "update"/"edit" mutator must not exist.
      expect((service as any).update).toBeUndefined();
      expect((service as any).edit).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Typed convenience posters — verify the posting recipe & balance
  // -------------------------------------------------------------------------
  describe('typed posters', () => {
    it('postSale: Dr Cash (revenue+tax) / Cr Revenue + Cr Tax + Dr COGS / Cr Inventory, balanced', async () => {
      // Arrange
      const spy = jest
        .spyOn(service, 'postEntry')
        .mockResolvedValue({ id: 'x' } as any);
      // Act
      await service.postSale({
        sourceType: 'order',
        sourceId: 'ord-1',
        revenue: 100,
        cogs: 60,
        tax: 7.5,
        isCash: true,
      });
      // Assert
      const input = spy.mock.calls[0][0];
      const byCode = Object.fromEntries(
        input.lines.map((l) => [l.accountCode, l]),
      );
      expect(byCode[ACCOUNT_CODES.CASH_ON_HAND].debit).toBe(107.5);
      expect(byCode[ACCOUNT_CODES.SALES_REVENUE].credit).toBe(100);
      expect(byCode[ACCOUNT_CODES.TAX_PAYABLE].credit).toBe(7.5);
      expect(byCode[ACCOUNT_CODES.COST_OF_GOODS_SOLD].debit).toBe(60);
      expect(byCode[ACCOUNT_CODES.INVENTORY].credit).toBe(60);
      const totals = input.lines.reduce(
        (acc, l) => ({
          d: acc.d + toCents(l.debit ?? 0),
          c: acc.c + toCents(l.credit ?? 0),
        }),
        { d: 0, c: 0 },
      );
      expect(totals.d).toBe(totals.c);
    });

    it('postSale: uses Accounts Receivable (not Cash) for a credit sale', async () => {
      const spy = jest
        .spyOn(service, 'postEntry')
        .mockResolvedValue({ id: 'x' } as any);
      await service.postSale({
        sourceType: 'invoice',
        sourceId: 'inv-1',
        revenue: 100,
        isCash: false,
      });
      const codes = spy.mock.calls[0][0].lines.map((l) => l.accountCode);
      expect(codes).toContain(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE);
      expect(codes).not.toContain(ACCOUNT_CODES.CASH_ON_HAND);
    });

    it('postCustomerPayment: Dr Bank / Cr Accounts Receivable', async () => {
      const spy = jest
        .spyOn(service, 'postEntry')
        .mockResolvedValue({ id: 'x' } as any);
      await service.postCustomerPayment({ paymentId: 'p1', amount: 250 });
      const input = spy.mock.calls[0][0];
      expect(input.sourceType).toBe('customer_payment');
      expect(input.lines).toEqual([
        { accountCode: ACCOUNT_CODES.BANK, debit: 250 },
        { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, credit: 250 },
      ]);
    });

    it('postPayrollRun: rejects when gross !== net + taxWithheld', async () => {
      const spy = jest.spyOn(service, 'postEntry');
      await expect(
        service.postPayrollRun({
          payrollId: 'pr1',
          gross: 1000,
          net: 800,
          taxWithheld: 150, // 800 + 150 = 950 !== 1000
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(spy).not.toHaveBeenCalled();
    });

    it('postPayrollRun: posts a balanced entry when gross === net + taxWithheld', async () => {
      const spy = jest
        .spyOn(service, 'postEntry')
        .mockResolvedValue({ id: 'x' } as any);
      await service.postPayrollRun({
        payrollId: 'pr1',
        gross: 1000,
        net: 800,
        taxWithheld: 200,
      });
      const input = spy.mock.calls[0][0];
      const totals = input.lines.reduce(
        (acc, l) => ({
          d: acc.d + toCents(l.debit ?? 0),
          c: acc.c + toCents(l.credit ?? 0),
        }),
        { d: 0, c: 0 },
      );
      expect(totals.d).toBe(totals.c);
      expect(totals.d).toBe(100000);
    });

    it('postInventoryAdjustment: rejects a zero amount', async () => {
      await expect(
        service.postInventoryAdjustment({ adjustmentId: 'adj1', amount: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
