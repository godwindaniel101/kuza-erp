import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NetworkWalletService } from './network-wallet.service';

/**
 * Kuza Network wallet (Phase 3). JWT-only, scoped to the caller's tenant.
 * Read-only for now — funds move via order payment (POST /network/orders/:id/pay)
 * and, later, top-up / withdrawal.
 */
@ApiTags('Network')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('network/wallet')
export class NetworkWalletController {
  constructor(private readonly walletService: NetworkWalletService) {}

  @Get()
  async getWallet(@Req() req: any) {
    const data = await this.walletService.getWallet(req.user.tenantId);
    return { success: true, data };
  }
}
