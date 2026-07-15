import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { Account } from './entities/account.entity';
import {
  JournalEntry,
  JournalEntryStatus,
} from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { PostingService } from './posting.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';

export interface ListJournalEntriesQuery {
  page?: number;
  limit?: number;
  status?: JournalEntryStatus;
  from?: string;
  to?: string;
}

const JOURNAL_ENTRY_STATUSES: JournalEntryStatus[] = [
  'DRAFT',
  'POSTED',
  'REVERSED',
];

@Injectable()
export class JournalEntriesService {
  constructor(
    @InjectRepository(JournalEntry)
    private journalEntryRepository: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private journalLineRepository: Repository<JournalLine>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private chartOfAccountsService: ChartOfAccountsService,
    private postingService: PostingService,
  ) {}

  async findAll(query: ListJournalEntriesQuery) {
    await this.chartOfAccountsService.ensureSeeded();

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    // No relation joins: they resolve to the wrong schema under the tenant
    // transaction (known F7 quirk). Fetch entries, then batch-load lines and
    // accounts with direct queries.
    const qb: SelectQueryBuilder<JournalEntry> = this.journalEntryRepository
      .createQueryBuilder('entry')
      .orderBy('entry.date', 'DESC')
      .addOrderBy('entry.entryNumber', 'DESC');

    if (query.status) {
      if (!JOURNAL_ENTRY_STATUSES.includes(query.status)) {
        throw new BadRequestException(
          `Invalid status: ${query.status}. Must be one of ${JOURNAL_ENTRY_STATUSES.join(', ')}`,
        );
      }
      qb.andWhere('entry.status = :status', { status: query.status });
    }
    if (query.from) {
      qb.andWhere('entry.date >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('entry.date <= :to', { to: query.to });
    }

    const [entries, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const items = await this.attachLines(entries);
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<JournalEntry> {
    const entry = await this.journalEntryRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }
    const [withLines] = await this.attachLines([entry]);
    return withLines;
  }

  /** Batch-loads lines (with their account) onto entries via direct queries. */
  private async attachLines(entries: JournalEntry[]): Promise<JournalEntry[]> {
    if (entries.length === 0) {
      return entries;
    }
    const lines = await this.journalLineRepository.find({
      where: { journalEntryId: In(entries.map((e) => e.id)) },
      order: { createdAt: 'ASC' },
    });
    const accountIds = [...new Set(lines.map((l) => l.accountId))];
    const accounts = accountIds.length
      ? await this.accountRepository.find({ where: { id: In(accountIds) } })
      : [];
    const accountById = new Map(accounts.map((a) => [a.id, a]));
    const linesByEntry = new Map<string, JournalLine[]>();
    for (const line of lines) {
      line.account = accountById.get(line.accountId) ?? line.account;
      const arr = linesByEntry.get(line.journalEntryId) ?? [];
      arr.push(line);
      linesByEntry.set(line.journalEntryId, arr);
    }
    for (const entry of entries) {
      entry.lines = linesByEntry.get(entry.id) ?? [];
    }
    return entries;
  }

  /** Creates a manual DRAFT entry (validated balanced, accounts must exist and be active). */
  @Transactional()
  async createDraft(dto: CreateJournalEntryDto): Promise<JournalEntry> {
    await this.chartOfAccountsService.ensureSeeded();

    const validated = this.postingService.validateLines(dto.lines);

    const accountIds = [...new Set(dto.lines.map((l) => l.accountId))];
    const accounts = await this.accountRepository.find({
      where: { id: In(accountIds) },
    });
    const byId = new Map(accounts.map((a) => [a.id, a]));
    for (const accountId of accountIds) {
      const account = byId.get(accountId);
      if (!account) {
        throw new BadRequestException(`Unknown account: ${accountId}`);
      }
      if (!account.isActive) {
        throw new BadRequestException(
          `Account ${account.code} ${account.name} is inactive`,
        );
      }
    }

    // Header first, then lines with explicit FK — cascade inserts through the
    // OneToMany don't reliably backfill journalEntryId under the tenant
    // transaction (same fix as PostingService.postEntry).
    const entry = this.journalEntryRepository.create({
      entryNumber: await this.postingService.nextEntryNumber(),
      date: dto.date.slice(0, 10),
      memo: dto.memo ?? null,
      status: 'DRAFT',
      sourceType: null,
      sourceId: null,
    });
    const saved = await this.journalEntryRepository.save(entry);

    await this.journalLineRepository.save(
      dto.lines.map((l, i) =>
        this.journalLineRepository.create({
          journalEntryId: saved.id,
          accountId: l.accountId,
          debit: validated[i].debit.toFixed(2),
          credit: validated[i].credit.toFixed(2),
          description: l.description ?? null,
        }),
      ),
    );

    return this.findOne(saved.id);
  }

  /** Posts a DRAFT entry. Once posted, the entry is immutable. */
  @Transactional()
  async post(id: string, userId?: string): Promise<JournalEntry> {
    const entry = await this.findOne(id);
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException(
        `Only DRAFT entries can be posted (entry is ${entry.status})`,
      );
    }

    // Re-validate balance defensively before making the entry immutable.
    this.postingService.validateLines(
      entry.lines.map((l) => ({ debit: l.debit, credit: l.credit })),
    );

    entry.status = 'POSTED';
    entry.postedAt = new Date();
    entry.postedById = userId ?? null;
    await this.journalEntryRepository.save(entry);
    return this.findOne(id);
  }

  /** Reverses a POSTED entry via a mirrored reversal entry. */
  async reverse(id: string, userId?: string): Promise<JournalEntry> {
    return this.postingService.reverse(id, userId);
  }
}
