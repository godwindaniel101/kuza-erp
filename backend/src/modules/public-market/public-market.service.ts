import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { StorefrontSlugRoute } from '../storefront/entities/storefront-slug-route.entity';

export interface MarketItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  currency: string;
  storeName: string;
  storeSlug: string;
  category: string | null;
}

export interface MarketQuery {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface MarketResult {
  data: MarketItem[];
  total: number;
  hasMore: boolean;
}

// Per-store row cap (a single tenant can't dominate the merged set) and the
// overall assembly ceiling (bounds the in-memory array per request).
const MAX_PER_STORE = 200;
const MAX_ASSEMBLE = 2000;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

/**
 * Phase 1 (browse-only) cross-tenant retail marketplace read model.
 *
 * Aggregates sellable, in-stock inventory across EVERY tenant that has a
 * PUBLISHED storefront. Fully anonymous (no JWT, no tenant pin): the endpoint
 * iterates each published store's schema with its own query runner and an
 * explicit `SET search_path`, exactly like
 * NetworkCatalogService.deriveAutoListings, so no tenant schema leaks into the
 * shared pool. NO writes, NO payments, NO money-path — read-only aggregation.
 *
 * Published-store source of truth: the landlord `storefront_slug_routes` table
 * gives the {schemaName, slug} candidates, but a route row is only a routing
 * hint (written on store create, deleted on unpublish). Each candidate is
 * re-verified against StorefrontSite.isPublished INSIDE its own tenant schema
 * before any of its items are surfaced.
 */
@Injectable()
export class PublicMarketService {
  constructor(
    @InjectRepository(StorefrontSlugRoute, 'landlord')
    private readonly routeRepository: Repository<StorefrontSlugRoute>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Merge sellable items across all published stores, then sort + paginate.
   * NOTE: v1 in-memory pagination; move to a denormalized landlord index at scale.
   */
  async getMarket(query: MarketQuery): Promise<MarketResult> {
    const search = (query.search || '').trim();
    const category = (query.category || '').trim();
    const limit = Math.min(
      Math.max(1, Math.trunc(query.limit || DEFAULT_LIMIT)),
      MAX_LIMIT,
    );
    const page = Math.max(1, Math.trunc(query.page || 1));
    const offset = (page - 1) * limit;

    const routes = await this.routeRepository.find();

    const merged: MarketItem[] = [];
    for (const route of routes) {
      if (merged.length >= MAX_ASSEMBLE) break;
      const rows = await this.readStoreItems(route, search, category);
      if (rows) merged.push(...rows);
    }

    // Stable sort so slicing is deterministic across page requests (offset-based
    // pagination requires a fixed order between calls).
    merged.sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      if (an !== bn) return an < bn ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

    const total = merged.length;
    const data = merged.slice(offset, offset + limit);
    return { data, total, hasMore: offset + limit < total };
  }

  /**
   * Distinct category names across published stores (for the frontend category
   * chips). There is no global taxonomy — these are each tenant's own category
   * name strings, de-duplicated case-insensitively.
   */
  async getCategories(): Promise<string[]> {
    const routes = await this.routeRepository.find();
    // Preserve the first-seen display casing while de-duping case-insensitively.
    const byLower = new Map<string, string>();
    for (const route of routes) {
      const names = await this.readStoreCategories(route);
      if (!names) continue;
      for (const name of names) {
        const key = name.toLowerCase();
        if (!byLower.has(key)) byLower.set(key, name);
      }
    }
    return [...byLower.values()].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
  }

  /**
   * Sellable, in-stock items for ONE store, tagged with store meta. Verifies the
   * store is published inside its own schema first. Never throws — a bad schema
   * returns null and is skipped so it can't fail the whole request.
   */
  private async readStoreItems(
    route: StorefrontSlugRoute,
    search: string,
    category: string,
  ): Promise<MarketItem[] | null> {
    return this.withPublishedStore(route, async (qr, store) => {
      const params: any[] = [];
      let sql = `
        SELECT i.id, i.name, i.sale_price, i.front_image, c.name AS category_name
        FROM inventory_items i
        LEFT JOIN inventory_categories c ON c.id = i.category_id
        WHERE COALESCE(i.current_stock, 0) > 0
          AND COALESCE(i.sale_price, 0) > 0
          AND i.sell_at_pos IS NOT FALSE
          AND i.listed_on_market = true`;
      if (search) {
        params.push(`%${search}%`);
        sql += ` AND i.name ILIKE $${params.length}`;
      }
      if (category) {
        // Case-insensitive exact match on the tenant's own category name.
        params.push(category);
        sql += ` AND c.name ILIKE $${params.length}`;
      }
      sql += ` ORDER BY i.name ASC LIMIT ${MAX_PER_STORE}`;

      const rows: any[] = await qr.query(sql, params);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.sale_price || 0),
        imageUrl: this.absolutizeImage(r.front_image),
        currency: store.currency,
        storeName: store.storeName,
        storeSlug: store.slug,
        category: r.category_name || null,
      }));
    });
  }

  /** Distinct category names of sellable items for ONE published store. */
  private async readStoreCategories(
    route: StorefrontSlugRoute,
  ): Promise<string[] | null> {
    return this.withPublishedStore(route, async (qr) => {
      const rows: any[] = await qr.query(`
        SELECT DISTINCT c.name AS category_name
        FROM inventory_categories c
        JOIN inventory_items i ON i.category_id = c.id
        WHERE COALESCE(i.current_stock, 0) > 0
          AND COALESCE(i.sale_price, 0) > 0
          AND i.sell_at_pos IS NOT FALSE
          AND i.listed_on_market = true
          AND c.name IS NOT NULL
      `);
      return rows.map((r) => r.category_name).filter(Boolean);
    });
  }

  /**
   * Run `fn` against a single tenant's schema IFF its storefront is published.
   * Mirrors deriveAutoListings: connect, SET search_path, work, then always
   * reset search_path + release in finally. Returns null (never throws) on any
   * error or if the store is not published, so one bad schema is skipped.
   */
  private async withPublishedStore<T>(
    route: StorefrontSlugRoute,
    fn: (
      qr: QueryRunner,
      store: { storeName: string; slug: string; currency: string },
    ) => Promise<T>,
  ): Promise<T | null> {
    // Defense in depth: schemaName is interpolated into SET search_path below.
    // It comes from our own landlord table (never user input), but we still
    // shape-validate it. Mirrors the tenant interceptor's guard.
    if (!/^[A-Za-z0-9_]+$/.test(route.schemaName)) return null;

    const qr = this.dataSource.createQueryRunner();
    try {
      await qr.connect();
      await qr.query(`SET search_path TO "${route.schemaName}", public`);

      // Re-verify publish state inside the tenant schema (the landlord route row
      // is only a routing hint — it exists for created-but-unpublished stores).
      const siteRows: any[] = await qr.query(
        `SELECT slug, store_name, currency, is_published FROM storefront_sites LIMIT 1`,
      );
      const site = siteRows[0];
      if (!site || site.is_published !== true || site.slug !== route.slug) {
        return null;
      }

      return await fn(qr, {
        storeName: site.store_name,
        slug: site.slug,
        currency: site.currency || 'NGN',
      });
    } catch {
      return null;
    } finally {
      try {
        await qr.query('SET search_path TO public');
      } catch {
        /* ignore reset errors */
      }
      await qr.release();
    }
  }

  /**
   * Absolutize a stored image URL to the API origin, mirroring the frontend
   * `resolveImageUrl`: local uploads are RELATIVE (`/uploads/...`) so the
   * cross-tenant marketplace frontend can render them without knowing the API
   * host; already-absolute (http/https/data/blob, e.g. GCS/S3) URLs pass through.
   */
  private absolutizeImage(src?: string | null): string | null {
    if (!src) return null;
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    const base = (
      this.configService.get<string>('PUBLIC_API_URL') ||
      this.configService.get<string>('API_URL') ||
      'http://localhost:4001'
    ).replace(/\/+$/, '');
    return `${base}${src.startsWith('/') ? '' : '/'}${src}`;
  }
}
