import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as sharp from 'sharp';
import { WebsiteSite } from './entities/website-site.entity';
import { WebsiteSlugRoute } from './entities/website-slug-route.entity';
import { Business } from '../../common/entities/business.entity';
import { StorageService } from '../../common/storage/storage.service';
import { UpdateWebsiteDto } from './dto/update-website.dto';

export interface TenantContext {
  id: string;
  schemaName: string;
}

export interface WebsiteInfoPayload {
  businessName: string;
  tagline: string | null;
  about: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  heroHeadline: string | null;
  heroSubtext: string | null;
  accentColor: string | null;
  templateKey: string;
  whatsapp: string | null;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  storefrontUrl: string | null;
  currency: string;
  slug: string;
  sections: unknown[] | null;
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
 * Kuza Website (website common app) service. Mirrors StorefrontService: one
 * WebsiteSite row per tenant (TENANT-scoped), a landlord slug route for
 * unauthenticated public resolution, and lazy per-tenant table creation. Unlike
 * the storefront it lists no products — it is a marketing site that links to the
 * tenant's Storefront (storefrontUrl). Images upload to the configurable object
 * store via StorageService.
 */
@Injectable()
export class WebsiteService {
  constructor(
    @InjectRepository(WebsiteSite)
    private readonly siteRepository: Repository<WebsiteSite>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(WebsiteSlugRoute, 'landlord')
    private readonly routeRepository: Repository<WebsiteSlugRoute>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  publicUrl(slug: string): string {
    const base =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4000';
    return `${base.replace(/\/$/, '')}/site/${slug}`;
  }

  /**
   * Tenant schemas are snapshots of the public schema taken at registration
   * time, so tenants created before this feature won't have the website_sites
   * table. Lazily mirror it (dev has synchronize=true, so public.website_sites
   * exists). A prod migration to create these tables is a follow-up (same
   * baseline as the storefront feature). The schemaName comes from the landlord
   * tenants table and is shape-validated before being quoted into DDL.
   */
  private async ensureSiteTable(schemaName: string): Promise<void> {
    if (!/^[A-Za-z0-9_]+$/.test(schemaName)) {
      throw new NotFoundException('Invalid tenant schema');
    }
    await this.dataSource.manager.query(
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."website_sites" (LIKE public."website_sites" INCLUDING ALL)`,
    );
  }

  /** One site per tenant for v1 — create with sensible defaults on first read. */
  async getOrCreateSite(
    tenant: TenantContext,
    businessId?: string,
  ): Promise<WebsiteSite> {
    await this.ensureSiteTable(tenant.schemaName);

    const existing = await this.siteRepository.find({ take: 1 });
    if (existing.length > 0) {
      return existing[0];
    }

    const business = businessId
      ? await this.businessRepository.findOne({ where: { id: businessId } })
      : (await this.businessRepository.find({ take: 1 }))[0] || null;

    const businessName = business?.name || 'My Business';
    const slug = await this.generateUniqueSlug(businessName);

    const site = this.siteRepository.create({
      slug,
      isPublished: false,
      templateKey: 'classic',
      businessName,
      heroHeadline: businessName,
      logoUrl: business?.logo || null,
      currency: business?.currency || 'NGN',
    });
    const saved = await this.siteRepository.save(site);

    // Reserve the slug in the landlord routing table (row written on create).
    // Publishing is still gated by isPublished on the public read.
    await this.upsertRoute(tenant, saved.slug);

    return saved;
  }

  private async generateUniqueSlug(businessName: string): Promise<string> {
    const base = slugify(businessName) || 'site';
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = `${base}-${randomSuffix()}`.slice(0, 60);
      const taken = await this.routeRepository.findOne({
        where: { slug: candidate },
      });
      if (!taken) return candidate;
    }
    return `${base}-${randomSuffix(8)}`.slice(0, 60);
  }

  /**
   * Keep exactly one route row per tenant, pointing at the current slug.
   * Throws Conflict if the slug is owned by another tenant.
   */
  private async upsertRoute(tenant: TenantContext, slug: string): Promise<void> {
    const bySlug = await this.routeRepository.findOne({ where: { slug } });
    if (bySlug && bySlug.tenantId !== tenant.id) {
      throw new ConflictException('This link is already taken by another site');
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
    dto: UpdateWebsiteDto,
    businessId?: string,
  ): Promise<WebsiteSite> {
    const site = await this.getOrCreateSite(tenant, businessId);

    if (dto.slug && dto.slug !== site.slug) {
      await this.upsertRoute(tenant, dto.slug);
      site.slug = dto.slug;
    }

    const assignable: (keyof UpdateWebsiteDto)[] = [
      'templateKey',
      'businessName',
      'tagline',
      'about',
      'logoUrl',
      'heroImageUrl',
      'heroHeadline',
      'heroSubtext',
      'accentColor',
      'whatsapp',
      'instagram',
      'phone',
      'email',
      'address',
      'storefrontUrl',
      'currency',
      'sections',
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
  ): Promise<WebsiteSite> {
    const site = await this.getOrCreateSite(tenant, businessId);
    // Re-assert the route row (deleted on unpublish; another tenant may have
    // claimed the slug in the meantime → Conflict, user picks a new slug).
    await this.upsertRoute(tenant, site.slug);
    site.isPublished = true;
    return this.siteRepository.save(site);
  }

  async unpublish(
    tenant: TenantContext,
    businessId?: string,
  ): Promise<WebsiteSite> {
    const site = await this.getOrCreateSite(tenant, businessId);
    site.isPublished = false;
    const saved = await this.siteRepository.save(site);
    // Unpublish deletes the routing row so the public URL 404s fast.
    await this.routeRepository.delete({ tenantId: tenant.id });
    return saved;
  }

  /**
   * Public read: the request is already pinned to the tenant schema by
   * SiteTenantGuard + TenantTransactionInterceptor. Re-verify slug and publish
   * state inside the tenant schema (the landlord row is only a routing hint).
   */
  async getPublicSiteBySlug(slug: string): Promise<{ site: WebsiteInfoPayload }> {
    const sites = await this.siteRepository.find({ take: 1 });
    const site = sites[0];
    if (!site || site.slug !== slug || !site.isPublished) {
      throw new NotFoundException('Site not found');
    }
    return { site: this.toSitePayload(site) };
  }

  /**
   * Sharp-compress an uploaded image and store it in the configurable object
   * store (local disk in dev, GCS/S3 in prod). Returns only the URL to persist.
   * Mirrors InventoryService.uploadItemImage.
   */
  async uploadImage(
    buffer: Buffer,
    mimetype: string,
    schema: string,
  ): Promise<string> {
    if (!mimetype || !mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }
    const jpeg = await sharp(buffer)
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    const key = this.storageService.buildKey(schema, 'website');
    return this.storageService.upload(jpeg, key, 'image/jpeg');
  }

  private toSitePayload(site: WebsiteSite): WebsiteInfoPayload {
    return {
      businessName: site.businessName,
      tagline: site.tagline || null,
      about: site.about || null,
      logoUrl: site.logoUrl || null,
      heroImageUrl: site.heroImageUrl || null,
      heroHeadline: site.heroHeadline || null,
      heroSubtext: site.heroSubtext || null,
      accentColor: site.accentColor || null,
      templateKey: site.templateKey || 'classic',
      whatsapp: site.whatsapp || null,
      instagram: site.instagram || null,
      phone: site.phone || null,
      email: site.email || null,
      address: site.address || null,
      storefrontUrl: site.storefrontUrl || null,
      currency: site.currency || 'NGN',
      slug: site.slug,
      sections: (site.sections as unknown[]) || null,
    };
  }
}
