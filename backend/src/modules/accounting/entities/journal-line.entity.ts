import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Account } from './account.entity';
import { JournalEntry } from './journal-entry.entity';

/**
 * One side of a double-entry posting. A line carries EITHER a debit OR a
 * credit amount (> 0), never both. Amounts are decimal(14,2); TypeORM
 * returns them as strings — coerce with Number() before arithmetic.
 */
@Entity('accounting_journal_lines')
export class JournalLine extends TenantEntity {
  @Index()
  @Column({ type: 'uuid' })
  journalEntryId: string;

  @ManyToOne(() => JournalEntry, (entry) => entry.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journalEntryId' })
  journalEntry: JournalEntry;

  @Index()
  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  debit: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  credit: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
