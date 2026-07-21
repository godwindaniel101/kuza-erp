import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { PaymentsService } from './payments.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { CreateAwaitingDto } from './dto/create-awaiting.dto';
import { UpdateSettlementDto } from './dto/update-settlement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('status')
  @RequirePermissions('payments.view')
  @ApiOperation({ summary: 'Payment provider configuration status' })
  status() {
    return { success: true, data: this.paymentsService.providerStatus() };
  }

  @Get('methods')
  @RequirePermissions('payments.view')
  @ApiOperation({ summary: 'List payment methods (with virtual accounts)' })
  async listMethods(@Query('branchId') branchId?: string) {
    return { success: true, data: await this.paymentsService.listMethods(branchId) };
  }

  @Post('methods')
  @RequirePermissions('payments.manage')
  @ApiOperation({ summary: 'Enable a payment option on a branch' })
  async createMethod(
    @Body() dto: CreatePaymentMethodDto,
    @I18n() i18n: I18nContext,
    @Request() req: any,
  ) {
    const data = await this.paymentsService.createMethod(dto, {
      id: req.user?.sub,
      name: req.user?.name,
    });
    return { success: true, data, message: i18n.t('common.created') };
  }

  @Delete('methods/:id')
  @RequirePermissions('payments.manage')
  @ApiOperation({ summary: 'Disable a payment option' })
  async removeMethod(@Param('id', ParseUUIDPipe) id: string, @I18n() i18n: I18nContext) {
    await this.paymentsService.removeMethod(id);
    return { success: true, message: i18n.t('common.deleted') };
  }

  @Get('transactions')
  @RequirePermissions('payments.view')
  @ApiOperation({ summary: 'List payment transactions' })
  async listTransactions(@Query('branchId') branchId?: string) {
    return { success: true, data: await this.paymentsService.listTransactions(branchId) };
  }

  @Post('awaiting')
  @RequirePermissions('orders.create')
  @ApiOperation({ summary: 'Start an awaiting-payment for a sale (returns the account to pay into)' })
  async createAwaiting(@Body() dto: CreateAwaitingDto, @Request() req: any) {
    const data = await this.paymentsService.createAwaiting({
      branchId: dto.branchId,
      orderId: dto.orderId,
      amount: dto.amount,
      actor: { id: req.user?.sub, name: req.user?.name },
    });
    return { success: true, data };
  }

  @Get('transactions/:id')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Poll a payment transaction status' })
  async getTransaction(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.paymentsService.getTransaction(id) };
  }

  // ---- 2FA (Google Authenticator) ---------------------------------------

  @Get('2fa/status')
  @RequirePermissions('payments.view')
  @ApiOperation({ summary: 'Whether the current user has 2FA enabled' })
  async twoFactorStatus(@Request() req: any) {
    return { success: true, data: await this.paymentsService.get2faStatus(req.user?.sub) };
  }

  @Post('2fa/setup')
  @RequirePermissions('payments.manage')
  @ApiOperation({ summary: 'Begin 2FA enrollment (returns secret + otpauth URI)' })
  async twoFactorSetup(@Request() req: any) {
    return {
      success: true,
      data: await this.paymentsService.setup2fa(req.user?.sub, req.user?.email),
    };
  }

  @Post('2fa/activate')
  @RequirePermissions('payments.manage')
  @ApiOperation({ summary: 'Confirm a code to activate 2FA' })
  async twoFactorActivate(@Body('code') code: string, @Request() req: any) {
    return { success: true, data: await this.paymentsService.activate2fa(req.user?.sub, code) };
  }

  // ---- Settlement account (2FA-gated) -----------------------------------

  @Get('settlement')
  @RequirePermissions('payments.view')
  @ApiOperation({ summary: 'Where inflows settle to' })
  async getSettlement() {
    return { success: true, data: await this.paymentsService.getSettlement() };
  }

  @Put('settlement')
  @RequirePermissions('payments.manage')
  @ApiOperation({ summary: 'Set/update the settlement account (requires 2FA code)' })
  async updateSettlement(
    @Body() dto: UpdateSettlementDto,
    @Request() req: any,
  ) {
    const data = await this.paymentsService.updateSettlement(dto, {
      id: req.user?.sub,
      name: req.user?.name,
    });
    return { success: true, data };
  }
}
