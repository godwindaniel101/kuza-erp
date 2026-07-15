import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { Account, normalBalanceForType } from './entities/account.entity';
import { JournalLine } from './entities/journal-line.entity';
import { DEFAULT_CHART } from './accounting.constants';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class ChartOfAccountsService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(JournalLine)
    private journalLineRepository: Repository<JournalLine>,
  ) {}

  /**
   * Lazy idempotent seeding: called at the top of account/report/posting
   * queries. Cheap existence check; seeds the default SME chart only when
   * the tenant has no accounts at all.
   */
  async ensureSeeded(): Promise<void> {
    const count = await this.accountRepository.count();
    if (count === 0) {
      await this.seedDefaults();
    }
  }

  @Transactional()
  async seedDefaults(): Promise<Account[]> {
    const count = await this.accountRepository.count();
    if (count > 0) {
      return this.accountRepository.find({ order: { code: 'ASC' } });
    }

    const accounts = DEFAULT_CHART.map((def) =>
      this.accountRepository.create({
        code: def.code,
        name: def.name,
        type: def.type,
        normalBalance: normalBalanceForType(def.type),
        parentId: null,
        isSystem: true,
        isActive: true,
        description: def.description ?? null,
      }),
    );

    return this.accountRepository.save(accounts);
  }

  async findAll(): Promise<Account[]> {
    await this.ensureSeeded();
    return this.accountRepository.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string): Promise<Account> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  async findByCode(code: string): Promise<Account | null> {
    return this.accountRepository.findOne({ where: { code } });
  }

  @Transactional()
  async create(dto: CreateAccountDto): Promise<Account> {
    await this.ensureSeeded();

    const existing = await this.accountRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `An account with code ${dto.code} already exists`,
      );
    }

    if (dto.parentId) {
      const parent = await this.accountRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent account not found');
      }
      if (parent.type !== dto.type) {
        throw new BadRequestException(
          `Parent account is of type ${parent.type}; child must match`,
        );
      }
    }

    const account = this.accountRepository.create({
      code: dto.code,
      name: dto.name,
      type: dto.type,
      normalBalance: normalBalanceForType(dto.type),
      parentId: dto.parentId ?? null,
      isSystem: false,
      isActive: true,
      description: dto.description ?? null,
    });

    return this.accountRepository.save(account);
  }

  async update(id: string, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.findOne(id);

    if (dto.name !== undefined) {
      account.name = dto.name;
    }
    if (dto.description !== undefined) {
      account.description = dto.description;
    }
    if (dto.isActive !== undefined) {
      account.isActive = dto.isActive;
    }

    return this.accountRepository.save(account);
  }

  /**
   * Deletion is blocked for system accounts, accounts with journal lines,
   * and accounts that have children. Deactivate (isActive=false) instead.
   */
  @Transactional()
  async remove(id: string): Promise<void> {
    const account = await this.findOne(id);

    if (account.isSystem) {
      throw new BadRequestException(
        'System accounts cannot be deleted; deactivate instead',
      );
    }

    const usedCount = await this.journalLineRepository.count({
      where: { accountId: id },
    });
    if (usedCount > 0) {
      throw new BadRequestException(
        'Account has journal lines and cannot be deleted; deactivate instead',
      );
    }

    const childCount = await this.accountRepository.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'Account has child accounts and cannot be deleted',
      );
    }

    await this.accountRepository.remove(account);
  }
}
