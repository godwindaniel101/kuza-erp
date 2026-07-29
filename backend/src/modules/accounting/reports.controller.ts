import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';
import { ReportsService } from './reports.service';

@ApiTags('Accounting - Reports')
@Controller('accounting/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('books')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'Trial balance as of a date' })
  async trialBalance(@Query('asOf') asOf?: string) {
    const report = await this.reportsService.trialBalance(asOf);
    return { success: true, data: report };
  }

  @Get('general-ledger')
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'General ledger for one account' })
  async generalLedger(
    @Query('accountId') accountId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!accountId) {
      throw new BadRequestException('accountId is required');
    }
    const report = await this.reportsService.generalLedger(
      accountId,
      from,
      to,
    );
    return { success: true, data: report };
  }

  @Get('profit-loss')
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'Profit & loss for a period' })
  async profitLoss(@Query('from') from?: string, @Query('to') to?: string) {
    const report = await this.reportsService.profitLoss(from, to);
    return { success: true, data: report };
  }

  @Get('balance-sheet')
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'Balance sheet as of a date' })
  async balanceSheet(@Query('asOf') asOf?: string) {
    const report = await this.reportsService.balanceSheet(asOf);
    return { success: true, data: report };
  }
}
