import { BadRequestException } from '@nestjs/common';
import { JournalEntriesService } from './journal-entries.service';
import { PostingService } from './posting.service';
import { createMockRepo, MockRepo } from '../../../test/repo-mock';

/**
 * Invariants: a manual draft must be balanced (delegates to the shared
 * validateLines gate), must reference existing & active accounts, and only a
 * DRAFT may be transitioned to POSTED (posted entries are immutable).
 */
describe('JournalEntriesService', () => {
  let service: JournalEntriesService;
  let jeRepo: MockRepo;
  let lineRepo: MockRepo;
  let accountRepo: MockRepo;
  let chart: { ensureSeeded: jest.Mock };
  let posting: any;

  // Real validateLines (pure, no repo access) so balance checks are genuine.
  const realValidate = new PostingService(
    null as any,
    null as any,
    null as any,
    null as any,
  ).validateLines;

  beforeEach(() => {
    jeRepo = createMockRepo();
    lineRepo = createMockRepo();
    accountRepo = createMockRepo();
    chart = { ensureSeeded: jest.fn().mockResolvedValue(undefined) };
    posting = {
      validateLines: realValidate,
      nextEntryNumber: jest.fn().mockResolvedValue('JE-000001'),
      reverse: jest.fn(),
    };

    service = new JournalEntriesService(
      jeRepo as any,
      lineRepo as any,
      accountRepo as any,
      chart as any,
      posting as PostingService,
    );
  });

  const activeAccounts = [
    { id: 'acc-a', code: '1000', name: 'Cash', isActive: true },
    { id: 'acc-b', code: '4000', name: 'Sales', isActive: true },
  ];

  describe('createDraft', () => {
    const balancedDto = {
      date: '2026-07-15',
      memo: 'manual',
      lines: [
        { accountId: 'acc-a', debit: 100, credit: 0 },
        { accountId: 'acc-b', debit: 0, credit: 100 },
      ],
    };

    it('rejects an unbalanced entry (debits !== credits)', async () => {
      // Arrange
      const dto = {
        date: '2026-07-15',
        lines: [
          { accountId: 'acc-a', debit: 100, credit: 0 },
          { accountId: 'acc-b', debit: 0, credit: 90 },
        ],
      };
      // Act / Assert — thrown before any persistence.
      await expect(service.createDraft(dto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(jeRepo.save).not.toHaveBeenCalled();
      expect(lineRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a reference to an unknown account', async () => {
      accountRepo.find.mockResolvedValue([]); // nothing resolves
      await expect(
        service.createDraft(balancedDto as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(jeRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a reference to an inactive account', async () => {
      accountRepo.find.mockResolvedValue([
        { id: 'acc-a', code: '1000', name: 'Cash', isActive: true },
        { id: 'acc-b', code: '4000', name: 'Sales', isActive: false },
      ]);
      await expect(
        service.createDraft(balancedDto as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(jeRepo.save).not.toHaveBeenCalled();
    });

    it('persists a balanced DRAFT referencing active accounts', async () => {
      // Arrange
      accountRepo.find.mockResolvedValue(activeAccounts);
      jeRepo.save.mockImplementation((e: any) => {
        if (!e.id) e.id = 'je-1';
        return Promise.resolve(e);
      });
      jeRepo.findOne.mockResolvedValue({ id: 'je-1', status: 'DRAFT' });
      lineRepo.find.mockResolvedValue([]);
      // Act
      await service.createDraft(balancedDto as any);
      // Assert
      const header = jeRepo.save.mock.calls[0][0];
      expect(header.status).toBe('DRAFT');
      expect(lineRepo.save).toHaveBeenCalledTimes(1);
      const lines = lineRepo.save.mock.calls[0][0];
      expect(lines).toHaveLength(2);
      expect(lines[0].journalEntryId).toBe('je-1');
    });
  });

  describe('post', () => {
    it('refuses to post a non-DRAFT entry (posted entries are immutable)', async () => {
      // Arrange: findOne returns an already-POSTED entry.
      jeRepo.findOne.mockResolvedValue({
        id: 'je-1',
        status: 'POSTED',
      });
      lineRepo.find.mockResolvedValue([]);
      accountRepo.find.mockResolvedValue([]);
      // Act / Assert
      await expect(service.post('je-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('transitions a DRAFT to POSTED with postedAt/postedById set', async () => {
      // Arrange
      const entry: any = { id: 'je-1', status: 'DRAFT' };
      jeRepo.findOne.mockResolvedValue(entry);
      lineRepo.find.mockResolvedValue([
        { journalEntryId: 'je-1', accountId: 'acc-a', debit: '100.00', credit: '0.00' },
        { journalEntryId: 'je-1', accountId: 'acc-b', debit: '0.00', credit: '100.00' },
      ]);
      accountRepo.find.mockResolvedValue(activeAccounts);
      // Act
      await service.post('je-1', 'user-9');
      // Assert
      expect(entry.status).toBe('POSTED');
      expect(entry.postedAt).toBeInstanceOf(Date);
      expect(entry.postedById).toBe('user-9');
      expect(jeRepo.save).toHaveBeenCalledWith(entry);
    });

    it('re-validates balance defensively before posting (rejects a corrupt draft)', async () => {
      // Arrange: a DRAFT whose stored lines no longer balance.
      const entry: any = { id: 'je-1', status: 'DRAFT' };
      jeRepo.findOne.mockResolvedValue(entry);
      lineRepo.find.mockResolvedValue([
        { journalEntryId: 'je-1', accountId: 'acc-a', debit: '100.00', credit: '0.00' },
        { journalEntryId: 'je-1', accountId: 'acc-b', debit: '0.00', credit: '5.00' },
      ]);
      accountRepo.find.mockResolvedValue(activeAccounts);
      // Act / Assert
      await expect(service.post('je-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(entry.status).toBe('DRAFT'); // unchanged
    });
  });

  describe('reverse', () => {
    it('delegates to PostingService.reverse', async () => {
      posting.reverse.mockResolvedValue({ id: 'rev-1' });
      const result = await service.reverse('je-1', 'user-1');
      expect(posting.reverse).toHaveBeenCalledWith('je-1', 'user-1');
      expect(result).toEqual({ id: 'rev-1' });
    });
  });
});
