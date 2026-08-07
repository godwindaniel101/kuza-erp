import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { StorefrontSlugRoute } from '../storefront/entities/storefront-slug-route.entity';
import { MarketplaceCheckout } from './entities/marketplace-checkout.entity';
import { MarketplaceCheckoutSeller } from './entities/marketplace-checkout-seller.entity';
import { CheckoutBuyerDto, CheckoutItemDto } from './dto/create-checkout.dto';

/** Expected, per-seller business failure (bad slug, no stock, no payment set-up
 *  etc.). Its message becomes the seller's `failReason`; it NEVER aborts the
 *  whole checkout — the saga records it and moves to the next seller. */
class SellerCheckoutError extends Error {}

interface SellerOrderResult {
  sellerTenantId: string;
  schemaName: string;
  storeName: string;
  storeSlug: string;
  branchId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentReference: string;
  accountNumber: string | null;
  bankName: string | null;
  accountName: string | null;
}

/** Only interpolated into `SET search_path`; must be a bare identifier. */
const SCHEMA_NAME_RE = /^[A-Za-z0-9_]+$/;

const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Phase 2 guest marketplace checkout — "per-seller payment" model. MONEY-PATH.
 *
 * A guest cart spanning multiple seller tenants is split into ONE pending order
 * per seller, each with ONE awaiting bank-transfer payment into THAT seller's
 * own virtual account. The existing Monnify webhook flips each seller's order to
 * paid independently; each seller fulfils their own order later. No escrow, no
 * commission, bank-transfer only.
 *
 * Correctness guarantees:
 *  - Idempotency: a landlord `marketplace_checkouts` row with a UNIQUE
 *    idempotency_key is the concurrency guard. Only the request that wins that
 *    INSERT creates any orders/payments; every retry/duplicate re-reads and
 *    returns the SAME result (never re-creates).
 *  - Server-authoritative prices: every amount is computed from the seller's own
 *    `inventory_items.sale_price` re-read at checkout — client prices are ignored.
 *  - Partial-failure saga: sellers can't share one DB transaction (N schemas), so
 *    each seller is processed best-effort in its own try/catch and its outcome is
 *    persisted to `marketplace_checkout_sellers`. Per-seller writes ARE atomic
 *    (order + items + payment in one transaction inside the seller's schema).
 *
 * Mirrors PublicMarketService.withPublishedStore and
 * NetworkOrdersService.createPendingSaleForSupplier for all raw per-schema SQL.
 */
@Injectable()
export class MarketplaceCheckoutService {
  private readonly logger = new Logger(MarketplaceCheckoutService.name);

  constructor(
    @InjectRepository(StorefrontSlugRoute, 'landlord')
    private readonly routeRepository: Repository<StorefrontSlugRoute>,
    @InjectRepository(MarketplaceCheckout, 'landlord')
    private readonly checkoutRepo: Repository<MarketplaceCheckout>,
    @InjectRepository(MarketplaceCheckoutSeller, 'landlord')
    private readonly sellerRepo: Repository<MarketplaceCheckoutSeller>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Split a guest cart into one pending order + awaiting payment per seller.
   * Returns the response `data` payload (the controller adds the envelope).
   */
  async checkout(input: {
    idempotencyKey: string;
    buyer: CheckoutBuyerDto;
    items: CheckoutItemDto[];
  }) {
    // Group lines by store. A guest may add the same item twice — keep lines as
    // sent; server re-validation collapses each itemId to one sellable line.
    const groups = new Map<string, CheckoutItemDto[]>();
    for (const it of input.items) {
      const bucket = groups.get(it.storeSlug);
      if (bucket) bucket.push(it);
      else groups.set(it.storeSlug, [it]);
    }

    // IDEMPOTENCY GUARD: claim the key first. The UNIQUE constraint makes a
    // concurrent double-submit safe — the loser catches 23505 and replays the
    // winner's result instead of creating a second set of orders/payments.
    let checkout: MarketplaceCheckout;
    try {
      checkout = await this.checkoutRepo.save(
        this.checkoutRepo.create({
          idempotencyKey: input.idempotencyKey,
          reference: this.genReference(),
          buyerName: input.buyer.name,
          buyerPhone: input.buyer.phone,
          buyerEmail: input.buyer.email ?? null,
          status: 'creating',
        }),
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return this.buildExistingResult(input.idempotencyKey);
      }
      throw error;
    }

    // This request owns the checkout — process each seller best-effort.
    const routes = await this.routeRepository.find();
    const routeBySlug = new Map(routes.map((r) => [r.slug, r]));

    const sellerRows: MarketplaceCheckoutSeller[] = [];
    for (const [slug, lines] of groups) {
      const route = routeBySlug.get(slug);
      let row: MarketplaceCheckoutSeller;
      try {
        if (!route) {
          throw new SellerCheckoutError('Store not found or no longer available');
        }
        const created = await this.createSellerOrder(route, lines, input.buyer);
        row = this.sellerRepo.create({
          checkoutId: checkout.id,
          status: 'awaiting',
          ...created,
        });
      } catch (error) {
        const reason =
          error instanceof SellerCheckoutError
            ? error.message
            : 'Could not create order for this store';
        if (!(error instanceof SellerCheckoutError)) {
          this.logger.error(
            `Marketplace checkout ${checkout.reference}: unexpected failure for store ${slug}: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
        row = this.sellerRepo.create({
          checkoutId: checkout.id,
          sellerTenantId: route?.tenantId ?? null,
          schemaName: route?.schemaName ?? null,
          storeName: slug,
          storeSlug: slug,
          amount: 0,
          currency: 'NGN',
          status: 'failed',
          failReason: reason,
        });
      }
      sellerRows.push(await this.sellerRepo.save(row));
    }

    // awaiting_payment if >=1 seller succeeded, else failed. (Never throw the
    // whole checkout — the buyer still gets a reference + the failed list.)
    checkout.status = sellerRows.some((r) => r.status === 'awaiting')
      ? 'awaiting_payment'
      : 'failed';
    await this.checkoutRepo.save(checkout);

    return this.formatCheckoutResult(checkout, sellerRows);
  }

  /**
   * Live status for a checkout: re-read each seller's order status from ITS OWN
   * schema (never cached landlord-side), so the guest sees payments land as the
   * webhook flips each order. Returns the response `data` payload.
   */
  async getStatus(reference: string) {
    const checkout = await this.checkoutRepo.findOne({ where: { reference } });
    if (!checkout) throw new NotFoundException('Checkout not found');

    const sellerRows = await this.sellerRepo.find({
      where: { checkoutId: checkout.id },
      order: { createdAt: 'ASC' },
    });

    const sellers = [];
    for (const r of sellerRows) {
      const status =
        r.status === 'failed' ? 'failed' : await this.readLiveOrderStatus(r);
      sellers.push({
        storeName: r.storeName,
        orderNumber: r.orderNumber,
        amount: Number(r.amount),
        currency: r.currency,
        status,
        // Include the virtual account so the payment page works from the
        // reference alone (new device / cleared tab) — the buyer can always
        // retrieve where to pay. Failed sellers have no account.
        virtualAccount:
          r.status === 'failed'
            ? null
            : {
                accountNumber: r.accountNumber,
                bankName: r.bankName,
                accountName: r.accountName,
              },
        paymentReference: r.paymentReference ?? null,
      });
    }

    return {
      reference: checkout.reference,
      buyerName: checkout.buyerName,
      sellers,
    };
  }

  // ---- internals --------------------------------------------------------

  /**
   * Create ONE seller's pending order + awaiting bank-transfer payment inside
   * that seller's schema. Re-validates every line's price/stock server-side and
   * writes order + items + payment in a single per-schema transaction. Throws
   * SellerCheckoutError (caught by the saga) when the seller can't be checked
   * out (unpublished, no branch, no active bank-transfer method/account, or no
   * sellable lines).
   */
  private async createSellerOrder(
    route: StorefrontSlugRoute,
    lines: CheckoutItemDto[],
    buyer: CheckoutBuyerDto,
  ): Promise<SellerOrderResult> {
    if (!SCHEMA_NAME_RE.test(route.schemaName)) {
      throw new SellerCheckoutError('Store is not available');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    let inTransaction = false;
    try {
      await qr.query(`SET search_path TO "${route.schemaName}", public`);

      // Re-verify published INSIDE the schema (the landlord route is only a hint).
      const siteRows: any[] = await qr.query(
        `SELECT slug, store_name, currency, is_published FROM storefront_sites LIMIT 1`,
      );
      const site = siteRows[0];
      if (!site || site.is_published !== true || site.slug !== route.slug) {
        throw new SellerCheckoutError('Store is not currently published');
      }
      const storeName: string = site.store_name;
      const currency: string = site.currency || 'NGN';

      // SERVER-SIDE price re-validation — never trust client prices/names.
      const itemIds = [...new Set(lines.map((l) => l.itemId))];
      const itemRows: any[] = await qr.query(
        `SELECT id, name, sale_price, current_stock, sell_at_pos
           FROM inventory_items
          WHERE id = ANY($1::uuid[])`,
        [itemIds],
      );
      const itemById = new Map<string, any>(itemRows.map((r) => [r.id, r]));

      const saleLines: {
        inventoryItemId: string;
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[] = [];
      for (const line of lines) {
        const item = itemById.get(line.itemId);
        const sellable =
          item &&
          Number(item.current_stock) > 0 &&
          Number(item.sale_price) > 0 &&
          item.sell_at_pos !== false;
        if (!sellable) {
          // Drop + report; a dropped line never blocks the rest of the cart.
          this.logger.warn(
            `Marketplace checkout: dropped item ${line.itemId} x${line.qty} from store ${route.slug} — not sellable`,
          );
          continue;
        }
        const unitPrice = Number(item.sale_price); // SERVER price, authoritative
        const quantity = line.qty;
        saleLines.push({
          inventoryItemId: line.itemId,
          name: item.name,
          quantity,
          unitPrice,
          totalPrice: round2(unitPrice * quantity),
        });
      }
      if (!saleLines.length) {
        throw new SellerCheckoutError('No items are currently available from this store');
      }
      const subtotal = round2(saleLines.reduce((s, l) => s + l.totalPrice, 0));

      // Pick the seller's branch (same idiom as createPendingSaleForSupplier).
      const branchRows: any[] = await qr.query(
        'SELECT id FROM branches WHERE is_active = true ORDER BY is_default DESC, created_at ASC LIMIT 1',
      );
      if (!branchRows.length) {
        throw new SellerCheckoutError('Store cannot accept orders right now');
      }
      const branchId: string = branchRows[0].id;

      // The seller MUST have an active bank-transfer method + account to be paid.
      const methodRows: any[] = await qr.query(
        `SELECT id FROM payment_methods
          WHERE branch_id = $1 AND type = 'bank_transfer' AND status = 'active'
          LIMIT 1`,
        [branchId],
      );
      if (!methodRows.length) {
        throw new SellerCheckoutError('This store cannot receive bank-transfer payments yet');
      }
      const paymentMethodId: string = methodRows[0].id;

      const accountRows: any[] = await qr.query(
        `SELECT id, account_number, bank_name, account_name
           FROM payment_accounts
          WHERE payment_method_id = $1 AND status = 'active'
          LIMIT 1`,
        [paymentMethodId],
      );
      if (!accountRows.length) {
        throw new SellerCheckoutError('This store has no active payment account');
      }
      const account = accountRows[0];

      const orderNumber = `ORD-${Date.now().toString().slice(-8)}${Math.random()
        .toString(36)
        .substr(2, 4)
        .toUpperCase()}`;
      const paymentReference = `PAY-${Date.now().toString(36).toUpperCase()}${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      // Atomic write for THIS seller: pending order + items + awaiting payment.
      await qr.startTransaction();
      inTransaction = true;

      const orderRows: any[] = await qr.query(
        `INSERT INTO orders
           (id, branch_id, order_number, status, subtotal, tax, total_amount,
            total_cost, profit, allocation_method, customer_name, customer_phone,
            order_type, source, network_order_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'pending', $3, 0, $3, 0, 0, 'FIFO',
                 $4, $5, 'marketplace', 'marketplace', NULL, now(), now())
         RETURNING id`,
        [branchId, orderNumber, subtotal, buyer.name, buyer.phone],
      );
      const orderId: string = orderRows[0].id;

      for (const l of saleLines) {
        await qr.query(
          `INSERT INTO order_items
             (id, order_id, inventory_item_id, name, quantity, quantity_base,
              unit_price, total_price, cost_price, cost_total, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $4, $5, $6, 0, 0, now(), now())`,
          [orderId, l.inventoryItemId, l.name, l.quantity, l.unitPrice, l.totalPrice],
        );
      }

      // Awaiting bank-transfer payment — same shape as PaymentsService.createAwaiting.
      await qr.query(
        `INSERT INTO payment_transactions
           (id, branch_id, order_id, payment_method_id, payment_account_id,
            provider, payment_reference, amount, currency, status,
            customer_name, customer_phone, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'monnify', $5, $6, $7,
                 'awaiting', $8, $9, now(), now())`,
        [
          branchId,
          orderId,
          paymentMethodId,
          account.id,
          paymentReference,
          subtotal,
          currency,
          buyer.name,
          buyer.phone,
        ],
      );

      await qr.commitTransaction();
      inTransaction = false;

      return {
        sellerTenantId: route.tenantId,
        schemaName: route.schemaName,
        storeName,
        storeSlug: route.slug,
        branchId,
        orderId,
        orderNumber,
        amount: subtotal,
        currency,
        paymentReference,
        accountNumber: account.account_number ?? null,
        bankName: account.bank_name ?? null,
        accountName: account.account_name ?? null,
      };
    } catch (error) {
      if (inTransaction) {
        await qr.rollbackTransaction().catch(() => undefined);
      }
      throw error;
    } finally {
      await qr.query('SET search_path TO public').catch(() => undefined);
      await qr.release();
    }
  }

  /** Live-read one seller's order status from its schema; best-effort. */
  private async readLiveOrderStatus(
    seller: MarketplaceCheckoutSeller,
  ): Promise<'awaiting' | 'paid' | 'completed'> {
    if (
      !seller.orderId ||
      !seller.schemaName ||
      !SCHEMA_NAME_RE.test(seller.schemaName)
    ) {
      return 'awaiting';
    }
    const qr = this.dataSource.createQueryRunner();
    try {
      await qr.connect();
      await qr.query(`SET search_path TO "${seller.schemaName}", public`);
      const rows: any[] = await qr.query(
        `SELECT status FROM orders WHERE id = $1`,
        [seller.orderId],
      );
      const raw = rows[0]?.status;
      if (raw === 'paid') return 'paid';
      if (raw === 'completed') return 'completed';
      return 'awaiting';
    } catch {
      return 'awaiting';
    } finally {
      await qr.query('SET search_path TO public').catch(() => undefined);
      await qr.release();
    }
  }

  /** Idempotent replay: rebuild the response from the already-stored rows. */
  private async buildExistingResult(idempotencyKey: string) {
    const checkout = await this.checkoutRepo.findOne({
      where: { idempotencyKey },
    });
    if (!checkout) {
      // Extremely narrow race: the winning INSERT was rolled back after we saw
      // its 23505. Surface as not-found so the client retries with the same key.
      throw new NotFoundException('Checkout could not be found; please retry');
    }
    const sellerRows = await this.sellerRepo.find({
      where: { checkoutId: checkout.id },
      order: { createdAt: 'ASC' },
    });
    return this.formatCheckoutResult(checkout, sellerRows);
  }

  private formatCheckoutResult(
    checkout: MarketplaceCheckout,
    sellerRows: MarketplaceCheckoutSeller[],
  ) {
    return {
      reference: checkout.reference,
      sellers: sellerRows
        .filter((r) => r.status === 'awaiting')
        .map((r) => ({
          storeName: r.storeName,
          storeSlug: r.storeSlug,
          orderNumber: r.orderNumber,
          amount: Number(r.amount),
          currency: r.currency,
          virtualAccount: {
            accountNumber: r.accountNumber,
            bankName: r.bankName,
            accountName: r.accountName,
          },
          paymentReference: r.paymentReference,
        })),
      failed: sellerRows
        .filter((r) => r.status === 'failed')
        .map((r) => ({ storeName: r.storeName, reason: r.failReason })),
    };
  }

  private genReference(): string {
    return `MKT-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
  }

  /** Postgres unique-violation (duplicate idempotency_key / reference). */
  private isUniqueViolation(error: unknown): boolean {
    return (error as { code?: string })?.code === '23505';
  }
}
