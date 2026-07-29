import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketSettings } from './entities/market-settings.entity';
import { NetworkBusiness } from './entities/network-business.entity';
import { UpdateMarketSettingsDto } from './dto/market-settings.dto';

/**
 * Tenant-scoped marketplace rules. Registered on the DEFAULT connection, so the
 * repository is automatically scoped to the caller's schema via the per-request
 * search_path. Singleton: one row per tenant, created with defaults on first read.
 *
 * On update the two modes are mirrored onto the landlord NetworkBusiness so the
 * buyer-facing browse can read them (+ publicCatalog) without cross-schema hops.
 */
@Injectable()
export class MarketSettingsService {
  constructor(
    @InjectRepository(MarketSettings)
    private readonly settingsRepo: Repository<MarketSettings>,
    @InjectRepository(NetworkBusiness, 'landlord')
    private readonly businessRepo: Repository<NetworkBusiness>,
  ) {}

  /** Return the tenant's settings, creating the defaults row if it is absent. */
  async get(): Promise<MarketSettings> {
    const existing = await this.settingsRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (existing) return existing;
    const created = this.settingsRepo.create({
      availabilityMode: 'auto_in_stock',
      visibilityMode: 'public',
    });
    return this.settingsRepo.save(created);
  }

  /** Update the two modes on the singleton and mirror them to the landlord business. */
  async update(tenantId: string, dto: UpdateMarketSettingsDto): Promise<MarketSettings> {
    const settings = await this.get();
    if (dto.availabilityMode !== undefined) settings.availabilityMode = dto.availabilityMode;
    if (dto.visibilityMode !== undefined) settings.visibilityMode = dto.visibilityMode;
    if (dto.stockMode !== undefined) settings.stockMode = dto.stockMode;
    const saved = await this.settingsRepo.save(settings);

    // Mirror to the landlord business so the browse sees the modes + public flag.
    try {
      const biz = await this.businessRepo.findOne({ where: { tenantId } });
      if (biz) {
        biz.marketAvailabilityMode = saved.availabilityMode;
        biz.marketVisibilityMode = saved.visibilityMode;
        biz.marketStockMode = saved.stockMode;
        biz.publicCatalog = saved.visibilityMode === 'public';
        await this.businessRepo.save(biz);
      }
    } catch {
      // Non-fatal: settings still saved; browse falls back to defaults.
    }
    return saved;
  }
}
