import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketSettingsService } from './market-settings.service';
import { UpdateMarketSettingsDto } from './dto/market-settings.dto';

/**
 * Per-tenant marketplace rules. JWT-only; the repository is tenant-scoped via
 * the request search_path, so no tenant id is needed in the service.
 */
@ApiTags('Network')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('network/market-settings')
export class MarketSettingsController {
  constructor(private readonly marketSettingsService: MarketSettingsService) {}

  @Get()
  async get() {
    const data = await this.marketSettingsService.get();
    return { success: true, data };
  }

  @Patch()
  async update(@Req() req: any, @Body() dto: UpdateMarketSettingsDto) {
    const data = await this.marketSettingsService.update(req.user.tenantId, dto);
    return { success: true, data };
  }
}
