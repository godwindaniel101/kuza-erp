import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { PostingService } from './posting.service';
import { JournalEntriesService } from './journal-entries.service';
import { ReportsService } from './reports.service';
import { AccountsController } from './accounts.controller';
import { JournalEntriesController } from './journal-entries.controller';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Account, JournalEntry, JournalLine])],
  controllers: [AccountsController, JournalEntriesController, ReportsController],
  providers: [
    ChartOfAccountsService,
    PostingService,
    JournalEntriesService,
    ReportsService,
  ],
  exports: [PostingService, ChartOfAccountsService],
})
export class AccountingModule {}
