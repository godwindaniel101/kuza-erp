import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { NetworkCatalogItem } from './entities/network-catalog-item.entity';
import { TradePartnership } from './entities/trade-partnership.entity';
import { NetworkBusiness } from './entities/network-business.entity';
import { LandlordService } from '../../common/landlord/services/landlord.service';
import { CreateCatalogItemDto, UpdateCatalogItemDto } from './dto/catalog-item.dto';

/**
 * Kuza Network marketplace catalog (Phase 2). A supplier publishes listings;
 * buyers browse the listings of suppliers they are connected to (active
 * partnership) plus public listings of suppliers who enabled a public catalog.
 * Landlord-scoped so browsing spans tenants.
 */
@Injectable()
export class NetworkCatalogService {
  constructor(
    @InjectRepository(NetworkCatalogItem, 'landlord')
    private readonly catalogRepo: Repository<NetworkCatalogItem>,
    @InjectRepository(TradePartnership, 'landlord')
    private readonly partnershipRepo: Repository<TradePartnership>,
    @InjectRepository(NetworkBusiness, 'landlord')
    private readonly businessRepo: Repository<NetworkBusiness>,
    private readonly landlordService: LandlordService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /** The caller's own listings (supplier view). */
  async listMine(tenantId: string): Promise<NetworkCatalogItem[]> {
    return this.catalogRepo.find({
      where: { supplierTenantId: tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(tenantId: string, dto: CreateCatalogItemDto): Promise<NetworkCatalogItem> {
    const tenant = await this.landlordService.findTenantById(tenantId);
    const item = this.catalogRepo.create({
      supplierTenantId: tenantId,
      supplierName: tenant.name,
      sourceInventoryItemId: dto.sourceInventoryItemId ?? null,
      name: dto.name,
      description: dto.description ?? null,
      unit: dto.unit ?? null,
      price: dto.price,
      currency: dto.currency || tenant.currency || 'NGN',
      moq: dto.moq ?? 1,
      available: dto.available ?? true,
      isPublic: dto.isPublic ?? false,
      bargainAllowed: dto.bargainAllowed ?? false,
      imageUrl: dto.imageUrl ?? null,
      status: 'active',
    });
    return this.catalogRepo.save(item);
  }

  private async loadOwned(tenantId: string, id: string): Promise<NetworkCatalogItem> {
    const item = await this.catalogRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Catalog item not found');
    if (item.supplierTenantId !== tenantId) {
      throw new ForbiddenException('You can only manage your own listings');
    }
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateCatalogItemDto): Promise<NetworkCatalogItem> {
    const item = await this.loadOwned(tenantId, id);
    Object.assign(item, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      ...(dto.price !== undefined ? { price: dto.price } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.moq !== undefined ? { moq: dto.moq } : {}),
      ...(dto.available !== undefined ? { available: dto.available } : {}),
      ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
      ...(dto.bargainAllowed !== undefined ? { bargainAllowed: dto.bargainAllowed } : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
    });
    return this.catalogRepo.save(item);
  }

  async remove(tenantId: string, id: string): Promise<{ id: string }> {
    const item = await this.loadOwned(tenantId, id);
    await this.catalogRepo.delete({ id: item.id });
    return { id: item.id };
  }

  /**
   * Buyer-facing browse: available/active listings from suppliers the caller
   * is connected to, plus public listings from suppliers with a public
   * catalog. Excludes the caller's own listings.
   */
  async browse(
    tenantId: string,
    opts: { search?: string; supplierTenantId?: string; limit?: number; offset?: number },
  ): Promise<{ items: any[]; total: number; hasMore: boolean }> {
    const partners = await this.partnershipRepo.find({
      where: { buyerTenantId: tenantId, status: 'active' },
    });
    const connectedIds = partners.map((p) => p.supplierTenantId);
    const connectedSet = new Set(connectedIds);

    // Suppliers visible to this buyer: connected (any visibility) or public.
    const businesses = await this.businessRepo.find({ where: { status: 'active' } });
    // A supplier is publicly visible if its visibility mode is 'public' (the
    // default) or the legacy publicCatalog flag is on. Connected buyers always see.
    const isPublicSupplier = (b: NetworkBusiness) =>
      b.marketVisibilityMode === 'public' || b.publicCatalog;
    let visible = businesses.filter(
      (b) => b.tenantId !== tenantId && (connectedSet.has(b.tenantId) || isPublicSupplier(b)),
    );
    if (opts.supplierTenantId) {
      visible = visible.filter((b) => b.tenantId === opts.supplierTenantId);
    }
    if (visible.length === 0) return { items: [], total: 0, hasMore: false };

    // Assemble the full visible list, then paginate deterministically below.
    // Bounded so a huge network can't build an unbounded array per request.
    const MAX_ASSEMBLE = 500;

    const search = (opts.search || '').trim().toLowerCase();
    const results: any[] = [];

    // MANUAL-mode suppliers: their explicitly published listings.
    const manualIds = visible
      .filter((b) => b.marketAvailabilityMode === 'manual')
      .map((b) => b.tenantId);
    if (manualIds.length) {
      const qb = this.catalogRepo
        .createQueryBuilder('c')
        .where('c.available = :a', { a: true })
        .andWhere("c.status = 'active'")
        .andWhere('c.supplierTenantId IN (:...manualIds)', { manualIds })
        .andWhere(
          new Brackets((b) => {
            // Everyone sees public listings; connected buyers see all of theirs.
            b.orWhere('c.isPublic = true');
            if (connectedIds.length) {
              b.orWhere('c.supplierTenantId IN (:...connectedIds)', { connectedIds });
            }
          }),
        );
      if (search) {
        qb.andWhere(
          new Brackets((b) => {
            b.where('c.name ILIKE :q', { q: `%${search}%` }).orWhere('c.description ILIKE :q', {
              q: `%${search}%`,
            });
          }),
        );
      }
      results.push(...(await qb.orderBy('c.name', 'ASC').take(MAX_ASSEMBLE).getMany()));
    }

    // AUTO-mode suppliers: derive listings live from their in-stock sellable items.
    const autoSuppliers = visible.filter((b) => b.marketAvailabilityMode !== 'manual');
    for (const b of autoSuppliers) {
      const derived = await this.deriveAutoListings(b);
      for (const d of derived) {
        if (search && !String(d.name).toLowerCase().includes(search)) continue;
        results.push(d);
      }
      if (results.length >= MAX_ASSEMBLE) break;
    }

    // Stable sort so slicing is deterministic across page requests (offset-based
    // pagination requires a fixed order between calls).
    results.sort((a, b) => {
      const an = String(a.name || '').toLowerCase();
      const bn = String(b.name || '').toLowerCase();
      if (an !== bn) return an < bn ? -1 : 1;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    const total = results.length;
    const offset = Math.max(0, Math.trunc(opts.offset || 0));
    const limit = Math.min(Math.max(1, Math.trunc(opts.limit || 24)), 60);
    const items = results.slice(offset, offset + limit);
    return { items, total, hasMore: offset + limit < total };
  }

  /**
   * Live-derive marketplace listings for an AUTO-mode supplier from its own
   * in-stock, sellable inventory (cross-schema read of the supplier's tenant).
   * Price = item salePrice; availability follows real stock. Never throws.
   */
  private async deriveAutoListings(business: NetworkBusiness): Promise<any[]> {
    let tenant: { schemaName?: string } | undefined;
    try {
      tenant = await this.landlordService.findTenantById(business.tenantId);
    } catch {
      return [];
    }
    if (!tenant?.schemaName) return [];

    const qr = this.dataSource.createQueryRunner();
    try {
      await qr.connect();
      await qr.query(`SET search_path TO "${tenant.schemaName}", public`);
      const rows: any[] = await qr.query(`
        SELECT i.id, i.name, i.sale_price, i.front_image,
               u.abbreviation AS uom_abbr, u.name AS uom_name
        FROM inventory_items i
        LEFT JOIN uoms u ON u.id = i.base_uom_id
        WHERE COALESCE(i.current_stock, 0) > 0
          AND COALESCE(i.sale_price, 0) > 0
          AND i.sell_at_pos IS NOT FALSE
        ORDER BY i.name ASC
        LIMIT 200
      `);
      const isPublic = business.marketVisibilityMode === 'public' || business.publicCatalog;
      return rows.map((r) => ({
        id: `auto:${business.tenantId}:${r.id}`,
        supplierTenantId: business.tenantId,
        supplierName: business.name,
        sourceInventoryItemId: r.id,
        name: r.name,
        description: null,
        unit: r.uom_abbr || r.uom_name || null,
        price: Number(r.sale_price || 0),
        currency: (business as any).currency || 'NGN',
        moq: 1,
        available: true,
        isPublic,
        imageUrl: r.front_image || null,
        status: 'active',
        auto: true,
      }));
    } catch {
      return [];
    } finally {
      try {
        await qr.query('SET search_path TO public');
      } catch {
        /* ignore reset errors */
      }
      await qr.release();
    }
  }
}
