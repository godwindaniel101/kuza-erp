import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { StorefrontSite } from './entities/storefront-site.entity';
import { StorefrontSlugRoute } from './entities/storefront-slug-route.entity';
import { InventoryItem } from '../ims/entities/inventory-item.entity';
import { InventoryCategory } from '../ims/entities/inventory-category.entity';
import { Business } from '../../common/entities/business.entity';
import { UpdateStorefrontDto } from './dto/update-storefront.dto';

export interface TenantContext {
  id: string;
  schemaName: string;
}

export interface StorefrontProductPayload {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  currentStock: number;
  category: string | null;
}

export interface StorefrontInfoPayload {
  storeName: string;
  description: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  accentColor: string | null;
  templateKey: string;
  showPrices: boolean;
  whatsapp: string | null;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  slug: string;
}

export interface PublicStoreResponse {
  store: StorefrontInfoPayload;
  products: StorefrontProductPayload[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomSuffix(length = 4): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Kuza Storefront (shop vertical) service. Mirrors MenuSitesService exactly:
 * one StorefrontSite row per tenant (TENANT-scoped), a landlord slug route for
 * unauthenticated public resolution, and a relation-free public payload built
 * with In() batches (TypeORM relation loading resolves to the wrong tenant
 * schema in this codebase — verified quirk). Products are derived live from the
 * tenant's sellable in-stock inventory (see NetworkCatalogService.deriveAutoListings).
 *
 * This service does NOT touch the order engine or payments (a later step).
 */
@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(StorefrontSite)
    private readonly siteRepository: Repository<StorefrontSite>,
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryCategory)
    private readonly inventoryCategoryRepository: Repository<InventoryCategory>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(StorefrontSlugRoute, 'landlord')
    private readonly routeRepository: Repository<StorefrontSlugRoute>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  publicUrl(slug: string): string {
    const base =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4000';
    return `${base.replace(/\/$/, '')}/s/${slug}`;
  }

  /**
   * Tenant schemas are snapshots of the public schema taken at registration
   * time (TenantMigrationService), so tenants created before this feature won't
   * have the storefront_sites table. Lazily mirror it (dev has synchronize=true,
   * so public.storefront_sites exists). NOTE: a prod migration to create these
   * tables is a follow-up (same baseline as the menu-site feature). The
   * schemaName comes from the landlord tenants table via the guard and is
   * shape-validated before being quoted into DDL.
   */
  private async ensureSiteTable(schemaName: string): Promise<void> {
    if (!/^[A-Za-z0-9_]+$/.test(schemaName)) {
      throw new NotFoundException('Invalid tenant schema');
    }
    await this.dataSource.manager.query(
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."storefront_sites" (LIKE public."storefront_sites" INCLUDING ALL)`,
    );
  }

  /** One store per tenant for v1 — create with sensible defaults on first read. */
  async getOrCreateSite(
    tenant: TenantContext,
    businessId?: string,
  ): Promise<StorefrontSite> {
    await this.ensureSiteTable(tenant.schemaName);

    const existing = await this.siteRepository.find({ take: 1 });
    if (existing.length > 0) {
      return existing[0];
    }

    const business = businessId
      ? await this.businessRepository.findOne({ where: { id: businessId } })
      : (await this.businessRepository.find({ take: 1 }))[0] || null;

    const storeName = business?.name || 'My Store';
    const slug = await this.generateUniqueSlug(storeName);

    const site = this.siteRepository.create({
      slug,
      isPublished: false,
      templateKey: 'grid',
      storeName,
      logoUrl: business?.logo || null,
      currency: business?.currency || 'NGN',
      showPrices: true,
    });
    const saved = await this.siteRepository.save(site);

    // Reserve the slug in the landlord routing table (row written on create).
    // Publishing is still gated by isPublished on the public read.
    await this.upsertRoute(tenant, saved.slug);

    return saved;
  }

  private async generateUniqueSlug(storeName: string): Promise<string> {
    const base = slugify(storeName) || 'store';
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = `${base}-${randomSuffix()}`.slice(0, 60);
      const taken = await this.routeRepository.findOne({
        where: { slug: candidate },
      });
      if (!taken) return candidate;
    }
    // Practically unreachable; widen the suffix as a last resort.
    return `${base}-${randomSuffix(8)}`.slice(0, 60);
  }

  /**
   * Keep exactly one route row per tenant, pointing at the current slug.
   * Throws Conflict if the slug is owned by another tenant.
   */
  private async upsertRoute(
    tenant: TenantContext,
    slug: string,
  ): Promise<void> {
    const bySlug = await this.routeRepository.findOne({ where: { slug } });
    if (bySlug && bySlug.tenantId !== tenant.id) {
      throw new ConflictException('This link is already taken by another store');
    }

    const mine = await this.routeRepository.findOne({
      where: { tenantId: tenant.id },
    });
    if (mine) {
      if (mine.slug !== slug || mine.schemaName !== tenant.schemaName) {
        mine.slug = slug;
        mine.schemaName = tenant.schemaName;
        await this.routeRepository.save(mine);
      }
      return;
    }
    await this.routeRepository.save(
      this.routeRepository.create({
        slug,
        tenantId: tenant.id,
        schemaName: tenant.schemaName,
      }),
    );
  }

  async updateSite(
    tenant: TenantContext,
    dto: UpdateStorefrontDto,
    businessId?: string,
  ): Promise<StorefrontSite> {
    const site = await this.getOrCreateSite(tenant, businessId);

    if (dto.slug && dto.slug !== site.slug) {
      // Uniqueness is enforced globally via the landlord routing table.
      await this.upsertRoute(tenant, dto.slug);
      site.slug = dto.slug;
    }

    const assignable: (keyof UpdateStorefrontDto)[] = [
      'templateKey',
      'storeName',
      'description',
      'logoUrl',
      'heroImageUrl',
      'accentColor',
      'showPrices',
      'whatsapp',
      'instagram',
      'phone',
      'email',
      'currency',
    ];
    for (const key of assignable) {
      if (dto[key] !== undefined) {
        (site as any)[key] = dto[key];
      }
    }

    return this.siteRepository.save(site);
  }

  async publish(
    tenant: TenantContext,
    businessId?: string,
  ): Promise<StorefrontSite> {
    const site = await this.getOrCreateSite(tenant, businessId);
    // Re-assert the route row (it is deleted on unpublish; another tenant may
    // have claimed the slug in the meantime → Conflict, user picks a new slug).
    await this.upsertRoute(tenant, site.slug);
    site.isPublished = true;
    return this.siteRepository.save(site);
  }

  async unpublish(
    tenant: TenantContext,
    businessId?: string,
  ): Promise<StorefrontSite> {
    const site = await this.getOrCreateSite(tenant, businessId);
    site.isPublished = false;
    const saved = await this.siteRepository.save(site);
    // Unpublish deletes the routing row so the public URL 404s fast.
    await this.routeRepository.delete({ tenantId: tenant.id });
    return saved;
  }

  /**
   * Public read: the request is already pinned to the tenant schema by
   * StoreTenantGuard + TenantTransactionInterceptor. Re-verify slug and publish
   * state inside the tenant schema (the landlord row is only a routing hint) and
   * 404 otherwise.
   */
  async getPublicStoreBySlug(slug: string): Promise<PublicStoreResponse> {
    const sites = await this.siteRepository.find({ take: 1 });
    const site = sites[0];
    if (!site || site.slug !== slug || !site.isPublished) {
      throw new NotFoundException('Store not found');
    }
    return this.buildPublicPayload(site);
  }

  /** Authenticated preview — same payload the public endpoint serves. */
  async getPreview(
    tenant: TenantContext,
    businessId?: string,
  ): Promise<PublicStoreResponse> {
    const site = await this.getOrCreateSite(tenant, businessId);
    return this.buildPublicPayload(site);
  }

  /** The sellable, in-stock products the storefront lists (preview + public). */
  async getProducts(
    tenant: TenantContext,
    businessId?: string,
  ): Promise<StorefrontProductPayload[]> {
    await this.getOrCreateSite(tenant, businessId);
    return this.loadSellableProducts();
  }

  /**
   * Assemble the public payload with batched, relation-free queries.
   * IMPORTANT: no `relations:` / `leftJoinAndSelect` here — TypeORM relation
   * loading resolves to the wrong tenant schema in this codebase (verified
   * quirk shared with menu-sites). Read items, then category names with an In()
   * batch, and stitch.
   */
  private async buildPublicPayload(
    site: StorefrontSite,
  ): Promise<PublicStoreResponse> {
    const products = await this.loadSellableProducts();
    return { store: this.toStorePayload(site), products };
  }

  /**
   * Sellable in-stock products, read the deriveAutoListings way:
   * current_stock > 0 AND sale_price > 0 AND sell_at_pos IS NOT FALSE. Uses the
   * tenant-connection repository, so it reads the request's pinned schema.
   */
  private async loadSellableProducts(): Promise<StorefrontProductPayload[]> {
    const items = await this.inventoryItemRepository
      .createQueryBuilder('i')
      .where('COALESCE(i.currentStock, 0) > 0')
      .andWhere('COALESCE(i.salePrice, 0) > 0')
      .andWhere('i.sellAtPos IS NOT FALSE')
      .orderBy('i.name', 'ASC')
      .take(500)
      .getMany();

    if (items.length === 0) return [];

    const categoryIds = [
      ...new Set(items.map((i) => i.categoryId).filter(Boolean)),
    ];
    const categories = categoryIds.length
      ? await this.inventoryCategoryRepository.find({
          where: { id: In(categoryIds) },
        })
      : [];
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.salePrice || 0),
      imageUrl: item.frontImage || null,
      currentStock: Number(item.currentStock || 0),
      category: item.categoryId
        ? categoryNameById.get(item.categoryId) || null
        : null,
    }));
  }

  private toStorePayload(site: StorefrontSite): StorefrontInfoPayload {
    return {
      storeName: site.storeName,
      description: site.description || null,
      logoUrl: site.logoUrl || null,
      heroImageUrl: site.heroImageUrl || null,
      accentColor: site.accentColor || null,
      templateKey: site.templateKey || 'grid',
      showPrices: site.showPrices !== false,
      whatsapp: site.whatsapp || null,
      instagram: site.instagram || null,
      phone: site.phone || null,
      email: site.email || null,
      currency: site.currency || 'NGN',
      slug: site.slug,
    };
  }
}
