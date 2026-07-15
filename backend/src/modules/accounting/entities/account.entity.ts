import { Column, Entity, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'INCOME'
  | 'EXPENSE';

export type NormalBalance = 'DEBIT' | 'CREDIT';

export const ACCOUNT_TYPES: AccountType[] = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'INCOME',
  'EXPENSE',
];

/**
 * Normal balance is fully determined by account type:
 * ASSET / EXPENSE are debit-normal; LIABILITY / EQUITY / INCOME are credit-normal.
 */
export function normalBalanceForType(type: AccountType): NormalBalance {
  return type === 'ASSET' || type === 'EXPENSE' ? 'DEBIT' : 'CREDIT';
}

@Entity('accounting_accounts')
export class Account extends TenantEntity {
  @Index({ unique: true })
  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20 })
  type: AccountType;

  @Column({ type: 'varchar', length: 10 })
  normalBalance: NormalBalance;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  /** Seeded system accounts cannot be deleted. */
  @Column({ default: false })
  isSystem: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
