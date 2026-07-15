import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';
import { JournalEntriesService } from './journal-entries.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JournalEntryStatus } from './entities/journal-entry.entity';

@ApiTags('Accounting - Journal Entries')
@Controller('accounting/journal-entries')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('books')
@ApiBearerAuth()
export class JournalEntriesController {
  constructor(
    private readonly journalEntriesService: JournalEntriesService,
  ) {}

  @Get()
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'List journal entries (with lines and accounts)' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: JournalEntryStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.journalEntriesService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      from,
      to,
    });
    return { success: true, data: result };
  }

  @Get(':id')
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'Get journal entry by id' })
  async findOne(@Param('id') id: string) {
    const entry = await this.journalEntriesService.findOne(id);
    return { success: true, data: entry };
  }

  @Post()
  @RequirePermissions('accounting.manage')
  @ApiOperation({ summary: 'Create manual journal entry (DRAFT, balanced)' })
  async create(@Body() dto: CreateJournalEntryDto) {
    const entry = await this.journalEntriesService.createDraft(dto);
    return { success: true, data: entry };
  }

  @Post(':id/post')
  @RequirePermissions('accounting.manage')
  @ApiOperation({ summary: 'Post a DRAFT journal entry (becomes immutable)' })
  async post(@Param('id') id: string, @Request() req: any) {
    const entry = await this.journalEntriesService.post(id, req.user?.sub);
    return { success: true, data: entry };
  }

  @Post(':id/reverse')
  @RequirePermissions('accounting.manage')
  @ApiOperation({ summary: 'Reverse a POSTED journal entry' })
  async reverse(@Param('id') id: string, @Request() req: any) {
    const entry = await this.journalEntriesService.reverse(id, req.user?.sub);
    return { success: true, data: entry };
  }
}
