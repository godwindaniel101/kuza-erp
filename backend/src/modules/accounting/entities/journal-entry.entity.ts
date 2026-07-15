import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { JournalLine } from './journal-line.entity';

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED';

@Entity('accounting_journal_entries')
// One journal entry per business event (idempotency guard for PostingService).
@Index(['sourceType', 'sourceId'], {
  unique: true,
  // Raw SQL fragment: must use the physical (snake_case) column name.
  where: '"source_id" IS NOT NULL',
})
export class JournalEntry extends TenantEntity {
  /** Sequential per tenant, e.g. JE-000001. */
  @Index({ unique: true })
  @Column()
  entryNumber: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ type: 'varchar', length: 10, default: 'DRAFT' })
  status: JournalEntryStatus;

  /** Business event that produced this entry, e.g. 'inflow', 'order', 'payroll', 'reversal'. */
  @Column({ type: 'varchar', nullable: true })
  sourceType: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceId: string | null;

  /** Set on the ORIGINAL entry, pointing at the reversal entry. */
  @Column({ type: 'uuid', nullable: true })
  reversedByEntryId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  postedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  postedById: string | null;

  @OneToMany(() => JournalLine, (line) => line.journalEntry, {
    cascade: ['insert'],
  })
  lines: JournalLine[];
}
