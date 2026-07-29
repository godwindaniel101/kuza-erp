import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceSettingsService } from './invoice-settings.service';
import { UpdateInvoiceSettingsDto } from './dto/update-invoice-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';

@ApiTags('Invoicing')
@Controller('invoicing/settings')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('invoicing')
@ApiBearerAuth()
export class InvoiceSettingsController {
  constructor(
    private readonly invoiceSettingsService: InvoiceSettingsService,
  ) {}

  @Get()
  @RequirePermissions('sales.view')
  @ApiOperation({ summary: 'Get per-tenant invoice settings (created on first read)' })
  async get() {
    const data = await this.invoiceSettingsService.getOrCreate();
    return { success: true, data };
  }

  @Patch()
  @RequirePermissions('sales.manage')
  @ApiOperation({ summary: 'Update per-tenant invoice settings' })
  async update(@Body() dto: UpdateInvoiceSettingsDto) {
    const data = await this.invoiceSettingsService.update(dto);
    return { success: true, data };
  }
}
