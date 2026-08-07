import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PublicMarketService } from './public-market.service';
import { MarketplaceCheckoutService } from './marketplace-checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

/**
 * UNAUTHENTICATED cross-tenant retail marketplace (Phase 1 — browse only).
 *
 * @Public() opts out of the global JwtAuthGuard and TenantGuard. Unlike the
 * per-store public endpoint there is NO tenant pin at all: the service iterates
 * every published storefront's schema itself. Read-only aggregation — NO writes,
 * NO payments, NO money-path.
 *
 * There is NO global transform interceptor in this codebase, so the response
 * envelope ({ success, data, ... }) is built manually, matching PublicStoreController.
 */
@ApiTags('Public Marketplace')
@Public()
@Controller('public/market')
export class PublicMarketController {
  constructor(
    private readonly publicMarketService: PublicMarketService,
    private readonly checkoutService: MarketplaceCheckoutService,
  ) {}

  @Get()
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  @ApiOperation({
    summary: 'Sellable items aggregated across all published storefronts',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMarket(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { data, total, hasMore } = await this.publicMarketService.getMarket({
      search,
      category,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { success: true, data, total, hasMore };
  }

  @Get('categories')
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  @ApiOperation({
    summary: 'Distinct category names across all published storefronts',
  })
  async getCategories() {
    const data = await this.publicMarketService.getCategories();
    return { success: true, data };
  }

  /**
   * Guest multi-seller checkout (Phase 2 — per-seller payment). Splits the cart
   * into one pending order + one awaiting bank-transfer payment per seller and
   * returns per-seller payment instructions. Idempotent on `idempotencyKey`.
   */
  @Post('checkout')
  @ApiOperation({
    summary: 'Split a guest cart into one order + payment per seller',
  })
  async checkout(@Body() dto: CreateCheckoutDto) {
    const data = await this.checkoutService.checkout({
      idempotencyKey: dto.idempotencyKey,
      buyer: dto.buyer,
      items: dto.items,
    });
    return { success: true, data };
  }

  /** Guest checkout status — live per-seller order status (awaiting/paid/completed). */
  @Get('checkout/:reference')
  @ApiOperation({ summary: 'Live status of a guest marketplace checkout' })
  async checkoutStatus(@Param('reference') reference: string) {
    const data = await this.checkoutService.getStatus(reference);
    return { success: true, data };
  }
}
