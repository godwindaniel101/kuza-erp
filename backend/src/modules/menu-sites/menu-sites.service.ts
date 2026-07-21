import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { MenuSite } from './entities/menu-site.entity';
import { MenuSlugRoute } from './entities/menu-slug-route.entity';
import { Menu } from '../rms/entities/menu.entity';
import { MenuCategory } from '../rms/entities/menu-category.entity';
import { MenuItem } from '../rms/entities/menu-item.entity';
import { InventoryItem } from '../ims/entities/inventory-item.entity';
import { InventorySubcategory } from '../ims/entities/inventory-subcategory.entity';
import { Business } from '../../common/entities/business.entity';
import { UpdateMenuSiteDto } from './dto/update-menu-site.dto';

export interface TenantContext {
  id: string;
  schemaName: string;
}

export interface PublicMenuItemPayload {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl?: string | null;
  subcategory?: string | null;
  isAvailable: boolean;
}

export interface PublicMenuCategoryPayload {
  id: string;
  name: string;
  description?: string | null;
  items: PublicMenuItemPayload[];
}

export interface PublicMenuPayload {
  id: string;
  name: string;
  categories: PublicMenuCategoryPayload[];
}

export interface PublicVenuePayload {
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  twitter: string | null;
  feedbackUrl: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  currency: string;
  showPrices: boolean;
  templateKey: string;
  themeKey: string;
  accentColor: string | null;
  slug: string;
}

export interface PublicMenuResponse {
  venue: PublicVenuePayload;
  menus: PublicMenuPayload[];
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

@Injectable()
export class MenuSitesService {
  constructor(
    @InjectRepository(MenuSite)
    private readonly siteRepository: Repository<MenuSite>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
    @InjectRepository(MenuCategory)
    private readonly categoryRepository: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly itemRepository: Repository<MenuItem>,
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(InventorySubcategory)
    private readonly inventorySubcategoryRepository: Repository<InventorySubcategory>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(MenuSlugRoute, 'landlord')
    private readonly routeRepository: Repository<MenuSlugRoute>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  publicUrl(slug: string): string {
    const base =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4000';
    return `${base.replace(/\/$/, '')}/m/${slug}`;
  }

  /**
   * Store an uploaded logo (base64 data URL) under uploads/menu-logos/ and
   * return its public `/uploads/...` path (served statically by main.ts).
   * Raster images are resized/normalised to webp; SVGs are written verbatim
   * (sharp would rasterise them). Mirrors the fs/sharp/crypto approach in
   * InventoryService.processItemImage.
   */
  async uploadLogo(dataUrl: string): Promise<string> {
    const match = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,(.+)$/s.exec(
      dataUrl || '',
    );
    if (!match) {
      throw new BadRequestException(
        'dataUrl must be a base64 data URL for a png, jpeg, jpg, webp or svg+xml image',
      );
    }

    const mimeSubtype = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException('Uploaded image is empty');
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'menu-logos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const isSvg = mimeSubtype === 'svg+xml';
    const ext = isSvg ? 'svg' : 'webp';
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    if (isSvg) {
      fs.writeFileSync(filePath, buffer);
    } else {
      await sharp(buffer)
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toFile(filePath);
    }

    return `/uploads/menu-logos/${fileName}`;
  }

  /**
   * Tenant schemas are snapshots of the public schema taken at registration
   * time (TenantMigrationService), so tenants created before this feature
   * won't have the menu_sites table. Lazily mirror it (dev has
   * synchronize=true, so public.menu_sites exists). The schemaName comes from
   * the landlord tenants table via TenantGuard and is shape-validated before
   * being quoted into DDL.
   */
  private async ensureSiteTable(schemaName: string): Promise<void> {
    if (!/^[A-Za-z0-9_]+$/.test(schemaName)) {
      throw new NotFoundException('Invalid tenant schema');
    }
    // Uses dataSource.manager so the DDL runs on the same pinned,
    // schema-scoped connection as the rest of the request.
    await this.dataSource.manager.query(
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."menu_sites" (LIKE public."menu_sites" INCLUDING ALL)`,
    );
  }

  /** One site per tenant for v1 — create with sensible defaults on first read. */
  async getOrCreateSite(
    tenant: TenantContext,
    businessId?: string,
  ): Promise<MenuSite> {
    await this.ensureSiteTable(tenant.schemaName);

    const existing = await this.siteRepository.find({ take: 1 });
    if (existing.length > 0) {
      return existing[0];
    }

    const business = businessId
      ? await this.businessRepository.findOne({ where: { id: businessId } })
      : (await this.businessRepository.find({ take: 1 }))[0] || null;

    const venueName = business?.name || 'My Venue';
    const slug = await this.generateUniqueSlug(venueName);

    const site = this.siteRepository.create({
      slug,
      isPublished: false,
      templateKey: 'minimal',
      themeKey: 'cloud',
      venueName,
      logoUrl: business?.logo || null,
      currency: business?.currency || 'NGN',
      showPrices: true,
      menuIds: [],
    });
    const saved = await this.siteRepository.save(site);

    // Reserve the slug in the landlord routing table (spec: row written on
    // create). Publishing is still gated by isPublished on the public read.
    await this.upsertRoute(tenant, saved.slug);

    return saved;
  }

  private async generateUniqueSlug(venueName: string): Promise<string> {
    const base = slugify(venueName) || 'menu';
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
      throw new ConflictException('This link is already taken by another venue');
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
    dto: UpdateMenuSiteDto,
    businessId?: string,
  ): Promise<MenuSite> {
    const site = await this.getOrCreateSite(tenant, businessId);

    if (dto.slug && dto.slug !== site.slug) {
      // Uniqueness is enforced globally via the landlord routing table.
      await this.upsertRoute(tenant, dto.slug);
      site.slug = dto.slug;
    }

    const assignable: (keyof UpdateMenuSiteDto)[] = [
      'templateKey',
      'themeKey',
      'accentColor',
      'venueName',
      'tagline',
      'logoUrl',
      'address',
      'phone',
      'whatsapp',
      'instagram',
      'facebook',
      'tiktok',
      'twitter',
      'feedbackUrl',
      'wifiName',
      'wifiPassword',
      'currency',
      'showPrices',
      'menuIds',
    ];
    for (const key of assignable) {
      if (dto[key] !== undefined) {
        (site as any)[key] = dto[key];
      }
    }

    return this.siteRepository.save(site);
  }

  async publish(tenant: TenantContext, businessId?: string): Promise<MenuSite> {
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
  ): Promise<MenuSite> {
    const site = await this.getOrCreateSite(tenant, businessId);
    site.isPublished = false;
    const saved = await this.siteRepository.save(site);
    // Spec: unpublish deletes the routing row so the public URL 404s fast.
    await this.routeRepository.delete({ tenantId: tenant.id });
    return saved;
  }

  /**
   * Public read: the request is already pinned to the tenant schema by
   * MenuSiteTenantGuard + TenantTransactionInterceptor. Re-verify slug and
   * publish state inside the tenant schema (the landlord row is only a
   * routing hint) and 404 otherwise.
   */
  async getPublicMenuBySlug(slug: string): Promise<PublicMenuResponse> {
    const sites = await this.siteRepository.find({ take: 1 });
    const site = sites[0];
    if (!site || site.slug !== slug || !site.isPublished) {
      throw new NotFoundException('Menu not found');
    }
    return this.buildPublicPayload(site);
  }

  /** Authenticated preview — same payload the public endpoint serves. */
  async getPreview(
    tenant: TenantContext,
    businessId?: string,
  ): Promise<PublicMenuResponse> {
    const site = await this.getOrCreateSite(tenant, businessId);
    return this.buildPublicPayload(site);
  }

  /**
   * Assemble the public payload with batched, relation-free queries.
   * IMPORTANT: no `relations:` / `leftJoinAndSelect` here — TypeORM relation
   * loading resolves to the wrong tenant schema in this codebase (verified
   * F7 quirk). Read parents, then children with In() batches, and stitch.
   */
  private async buildPublicPayload(
    site: MenuSite,
  ): Promise<PublicMenuResponse> {
    const wantedIds =
      Array.isArray(site.menuIds) && site.menuIds.length > 0
        ? site.menuIds
        : null;

    const menus = await this.menuRepository.find({
      where: wantedIds
        ? { id: In(wantedIds), isActive: true }
        : { isActive: true },
      order: { createdAt: 'ASC' },
    });

    // Preserve the curator's ordering when menuIds is set.
    const orderedMenus = wantedIds
      ? wantedIds
          .map((id) => menus.find((m) => m.id === id))
          .filter((m): m is Menu => Boolean(m))
      : menus;

    if (orderedMenus.length === 0) {
      return { venue: this.toVenuePayload(site), menus: [] };
    }

    const menuIdList = orderedMenus.map((m) => m.id);
    const [categories, items] = await Promise.all([
      this.categoryRepository.find({
        where: { menuId: In(menuIdList) },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
      this.itemRepository.find({
        where: { menuId: In(menuIdList) },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
    ]);

    // Only Noir and Roast are image-forward; all other templates are text-only.
    const imagesOn = ['noir', 'roast', 'sakura'].includes(site.templateKey);

    // Backfill dish photos (image templates) and subcategory names (all
    // templates) from the linked inventory item, for menus built before these
    // were copied onto the menu item.
    const needMeta = items.filter(
      (i) => i.inventoryItemId && ((imagesOn && !i.image) || !i.subcategory),
    );
    if (needMeta.length > 0) {
      const invIds = [...new Set(needMeta.map((i) => i.inventoryItemId))];
      const inv = await this.inventoryItemRepository.find({
        where: { id: In(invIds) },
      });
      const invById = new Map(inv.map((i) => [i.id, i]));
      const subIds = [
        ...new Set(inv.map((i) => i.subcategoryId).filter(Boolean)),
      ];
      const subs = subIds.length
        ? await this.inventorySubcategoryRepository.find({
            where: { id: In(subIds) },
          })
        : [];
      const subNameById = new Map(subs.map((s) => [s.id, s.name]));
      for (const item of needMeta) {
        const invItem = invById.get(item.inventoryItemId);
        if (!invItem) continue;
        if (imagesOn && !item.image && invItem.frontImage) {
          item.image = invItem.frontImage;
        }
        if (!item.subcategory && invItem.subcategoryId) {
          item.subcategory = subNameById.get(invItem.subcategoryId) || null;
        }
      }
    }

    const itemsByCategory = new Map<string, MenuItem[]>();
    const uncategorizedByMenu = new Map<string, MenuItem[]>();
    for (const item of items) {
      if (item.categoryId) {
        const list = itemsByCategory.get(item.categoryId) || [];
        list.push(item);
        itemsByCategory.set(item.categoryId, list);
      } else {
        const list = uncategorizedByMenu.get(item.menuId) || [];
        list.push(item);
        uncategorizedByMenu.set(item.menuId, list);
      }
    }

    const toItemPayload = (item: MenuItem): PublicMenuItemPayload => ({
      id: item.id,
      name: item.name,
      description: item.description || null,
      price: Number(item.price || 0),
      imageUrl: imagesOn ? item.image || null : null,
      subcategory: item.subcategory || null,
      isAvailable: item.isAvailable !== false,
    });

    const menuPayloads: PublicMenuPayload[] = orderedMenus.map((menu) => {
      const menuCategories = categories.filter((c) => c.menuId === menu.id);
      const categoryPayloads: PublicMenuCategoryPayload[] = menuCategories
        .map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description || null,
          items: (itemsByCategory.get(category.id) || []).map(toItemPayload),
        }))
        .filter((c) => c.items.length > 0);

      const uncategorized = uncategorizedByMenu.get(menu.id) || [];
      if (uncategorized.length > 0) {
        categoryPayloads.push({
          id: `${menu.id}-uncategorized`,
          name: categoryPayloads.length > 0 ? 'More' : menu.name,
          description: null,
          items: uncategorized.map(toItemPayload),
        });
      }

      return {
        id: menu.id,
        name: menu.name,
        categories: categoryPayloads,
      };
    });

    return {
      venue: this.toVenuePayload(site),
      // Drop menus that ended up empty so templates never render bare headings.
      menus: menuPayloads.filter((m) => m.categories.length > 0),
    };
  }

  private toVenuePayload(site: MenuSite): PublicVenuePayload {
    return {
      name: site.venueName,
      tagline: site.tagline || null,
      logoUrl: site.logoUrl || null,
      address: site.address || null,
      phone: site.phone || null,
      whatsapp: site.whatsapp || null,
      instagram: site.instagram || null,
      facebook: site.facebook || null,
      tiktok: site.tiktok || null,
      twitter: site.twitter || null,
      feedbackUrl: site.feedbackUrl || null,
      wifiName: site.wifiName || null,
      wifiPassword: site.wifiPassword || null,
      currency: site.currency || 'NGN',
      showPrices: site.showPrices !== false,
      templateKey: site.templateKey || 'minimal',
      themeKey: site.themeKey || 'cloud',
      accentColor: site.accentColor || null,
      slug: site.slug,
    };
  }
}
