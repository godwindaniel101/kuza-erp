import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Accounting - Chart of Accounts')
@Controller('accounting/accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('books')
@ApiBearerAuth()
export class AccountsController {
  constructor(
    private readonly chartOfAccountsService: ChartOfAccountsService,
  ) {}

  @Get()
  @RequirePermissions('accounting.view')
  @ApiOperation({
    summary: 'Get chart of accounts (flat list; build tree via parentId)',
  })
  async findAll() {
    const accounts = await this.chartOfAccountsService.findAll();
    return { success: true, data: accounts };
  }

  @Post()
  @RequirePermissions('accounting.manage')
  @ApiOperation({ summary: 'Create account' })
  async create(@Body() dto: CreateAccountDto) {
    const account = await this.chartOfAccountsService.create(dto);
    return { success: true, data: account };
  }

  @Patch(':id')
  @RequirePermissions('accounting.manage')
  @ApiOperation({ summary: 'Update account (name/description/isActive only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    const account = await this.chartOfAccountsService.update(id, dto);
    return { success: true, data: account };
  }

  @Delete(':id')
  @RequirePermissions('accounting.manage')
  @ApiOperation({
    summary: 'Delete account (blocked for system or used accounts)',
  })
  async remove(@Param('id') id: string) {
    await this.chartOfAccountsService.remove(id);
    return { success: true, message: 'Account deleted successfully' };
  }
}
