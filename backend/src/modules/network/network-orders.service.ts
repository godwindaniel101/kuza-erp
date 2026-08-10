import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { NetworkOrder, NetworkOrderStatusEntry } from './entities/network-order.entity';
import { NetworkOrderItem } from './entities/network-order-item.entity';
import { LandlordService } from '../../common/landlord/services/landlord.service';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderActionDto } from './dto/order-action.dto';
import { ReceiveOrderDto } from './dto/receive-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { ShipOrderDto } from './dto/ship-order.dto';
import { NetworkWalletService } from './network-wallet.service';
import { AppNotificationsService } from '../notifications/app-notifications.service';
import { InvoicesService } from '../invoicing/invoices.service';
import { Customer } from '../customers/entities/customer.entity';
import { Invoice } from '../invoicing/entities/invoice.entity';
import { Branch } from '../../common/entities/branch.entity';
import { OrdersService } from '../rms/orders/orders.service';

type OrderRole = 'buyer' | 'supplier';

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Kuza Network purchase orders (Phase 1) — cross-tenant "request items from a
 * supplier" with a tracked status lifecycle. Landlord-scoped so both the buyer
 * and supplier tenants read the same order. No money moves here; the
 * goods-receipt -> inventory inflow integration is a later phase.
 *
 * Lifecycle: draft -> requested -> accepted -> shipped -> received
 *            (+ rejected / cancelled). Every transition appends to
 *            statusHistory (who + when), which powers the buyer/supplier
 *            timeline.
 */
@Injectable()
export class NetworkOrdersService {
  private readonly logger = new Logger(NetworkOrdersService.name);

  constructor(
    @InjectRepository(NetworkOrder, 'landlord')
    private readonly orderRepo: Repository<NetworkOrder>,
    @InjectRepository(NetworkOrderItem, 'landlord')
    private readonly itemRepo: Repository<NetworkOrderItem>,
    private readonly landlordService: LandlordService,
    private readonly walletService: NetworkWalletService,
    private readonly appNotifications: AppNotificationsService,
    private readonly invoicesService: InvoicesService,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    // TENANT-scoped (default connection): resolves in the caller's tenant DB.
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    // The POS engine — multi-branch FIFO stock debit + COGS. fulfil() runs in
    // the supplier's request/tenant context, so it debits their DB.
    private readonly rmsOrdersService: OrdersService,
    // Default (tenant) connection — used with a dedicated QueryRunner to write a
    // PENDING sale into the SUPPLIER's schema at checkout (cross-tenant).
    private readonly dataSource: DataSource,
  ) {}

  private lineTotal(item: Pick<OrderItemDto, 'quantity' | 'unitPrice'>): number {
    return round2(Number(item.quantity || 0) * Number(item.unitPrice || 0));
  }

  private historyEntry(status: string, byTenantId: string, note?: string): NetworkOrderStatusEntry {
    return { status, at: new Date().toISOString(), byTenantId, ...(note ? { note } : {}) };
  }

  /** Recompute + persist an order's subtotal/total from its live line items. */
  private async recomputeTotals(order: NetworkOrder): Promise<void> {
    const items = await this.itemRepo.find({ where: { orderId: order.id } });
    const subtotal = round2(items.reduce((s, i) => s + Number(i.lineTotal || 0), 0));
    order.subtotal = subtotal;
    order.total = subtotal;
    await this.orderRepo.save(order);
  }

  async create(tenantId: string, email: string | null, dto: CreateOrderDto): Promise<any> {
    const buyer = await this.landlordService.findTenantById(tenantId);
    if (dto.supplierTenantId && dto.supplierTenantId === tenantId) {
      throw new BadRequestException('You cannot place an order with yourself');
    }

    const year = new Date().getFullYear();
    const count = await this.orderRepo.count({ where: { buyerTenantId: tenantId } });
    const orderNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;
    const status = dto.submit === false ? 'draft' : 'requested';

    const order = this.orderRepo.create({
      orderNumber,
      buyerTenantId: tenantId,
      buyerName: buyer.name,
      supplierTenantId: dto.supplierTenantId ?? null,
      supplierName: dto.supplierName,
      supplierId: dto.supplierId ?? null,
      status,
      note: dto.note ?? null,
      expectedDate: dto.expectedDate ?? null,
      currency: dto.currency || buyer.currency || 'NGN',
      subtotal: 0,
      total: 0,
      statusHistory: [this.historyEntry(status, tenantId)],
      createdByEmail: email,
    });
    const saved = await this.orderRepo.save(order);

    await this.itemRepo.save(
      dto.items.map((i) =>
        this.itemRepo.create({
          orderId: saved.id,
          sourceInventoryItemId: i.sourceInventoryItemId ?? null,
          description: i.description,
          quantity: i.quantity,
          unit: i.unit ?? null,
          unitPrice: i.unitPrice ?? null,
          lineTotal: this.lineTotal(i),
        }),
      ),
    );
    await this.recomputeTotals(saved);

    // ONE record per side: the moment the buyer places the order, a PENDING sale
    // appears on the SELLER's sales table (their own /rms/orders/:id). The seller
    // processes it there (pick a branch -> fulfil) — never a separate network URL.
    if (status === 'requested' && saved.supplierTenantId) {
      await this.createPendingSaleForSupplier(saved);
    }

    // Notify the supplier of a new incoming sale (in-app, best-effort). Deep-link
    // straight to the pending sale on their sales table when it was materialized.
    if (status === 'requested' && saved.supplierTenantId) {
      void this.appNotifications.deliverToTenant(saved.supplierTenantId, {
        title: `New order ${saved.orderNumber}`,
        body: `${saved.buyerName} placed an order with you`,
        type: 'order',
        link: saved.salesOrderId
          ? `/rms/orders/${saved.salesOrderId}`
          : `/network/orders/${saved.id}`,
      });
    }
    return this.findOne(tenantId, saved.id);
  }

  /**
   * Cross-tenant: write a PENDING sale into the SUPPLIER's schema at checkout, so
   * the incoming order shows on the seller's own sales table (/rms/orders/:id)
   * from the start — no stock is debited yet. The seller later picks a branch and
   * fulfils it (rmsOrdersService.fulfil), which debits multi-branch FIFO stock +
   * COGS. Best-effort: if the seller has no branch or no stock-backed lines, we
   * leave the order as a network-only request (the buyer/seller still see it).
   *
   * Uses a dedicated QueryRunner with the supplier's search_path — the request
   * connection stays on the buyer's schema. The landlord order row (salesOrderId)
   * links the two sides.
   */
  private async createPendingSaleForSupplier(order: NetworkOrder): Promise<void> {
    if (order.salesOrderId || !order.supplierTenantId) return;
    const items = await this.itemRepo.find({ where: { orderId: order.id } });
    const saleLines = items
      .filter((i) => i.sourceInventoryItemId)
      .map((i) => {
        const quantity = Number(i.quantity || 0);
        const unitPrice = Number(i.unitPrice || 0);
        return {
          inventoryItemId: i.sourceInventoryItemId as string,
          name: i.description,
          quantity,
          unitPrice,
          totalPrice: round2(quantity * unitPrice),
        };
      });
    if (!saleLines.length) return; // off-catalog / free-text only — nothing to sell

    const supplier = await this.landlordService.findTenantById(order.supplierTenantId);
    if (!supplier?.schemaName) return;
    const subtotal = round2(saleLines.reduce((s, l) => s + l.totalPrice, 0));

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.query(`SET search_path TO "${supplier.schemaName}", public`);

      const branchRows = await qr.query(
        'SELECT id FROM branches WHERE is_active = true ORDER BY is_default DESC, created_at ASC LIMIT 1',
      );
      if (!branchRows.length) return; // seller has no branch — can't materialize a sale
      const branchId = branchRows[0].id;

      const orderNumber = `ORD-${Date.now().toString().slice(-8)}${Math.random()
        .toString(36)
        .substr(2, 4)
        .toUpperCase()}`;

      const orderRows = await qr.query(
        `INSERT INTO orders
           (id, branch_id, order_number, status, subtotal, tax, total_amount,
            total_cost, profit, allocation_method, customer_name, order_type,
            source, network_order_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'pending', $3, 0, $3, 0, 0, 'FIFO',
                 $4, 'marketplace', 'marketplace', $5, now(), now())
         RETURNING id`,
        [branchId, orderNumber, subtotal, order.buyerName, order.id],
      );
      const salesOrderId = orderRows[0].id as string;

      for (const l of saleLines) {
        await qr.query(
          `INSERT INTO order_items
             (id, order_id, inventory_item_id, name, quantity, quantity_base,
              unit_price, total_price, cost_price, cost_total, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $4, $5, $6, 0, 0, now(), now())`,
          [salesOrderId, l.inventoryItemId, l.name, l.quantity, l.unitPrice, l.totalPrice],
        );
      }

      order.salesOrderId = salesOrderId;
      await this.orderRepo.save(order);
    } catch (error) {
      this.logger.error(
        `Failed to materialize pending sale for order ${order.orderNumber} in supplier ${order.supplierTenantId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    } finally {
      await qr.query('SET search_path TO public').catch(() => undefined);
      await qr.release();
    }
  }

  /**
   * When a network order is settled (wallet transfer or confirmed external
   * payment), mirror the payment onto the SUPPLIER's own sales record so their
   * Sales list stops showing the credit sale as unpaid (D5). Runs in the
   * supplier's schema via a dedicated QueryRunner. Best-effort + idempotent: it
   * skips if the sale is already fully paid, so a retry never double-pays.
   */
  private async settleSupplierSale(
    order: NetworkOrder,
    method: 'wallet' | 'transfer',
  ): Promise<void> {
    if (!order.salesOrderId || !order.supplierTenantId) return;
    const supplier = await this.landlordService.findTenantById(order.supplierTenantId);
    if (!supplier?.schemaName) return;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.query(`SET search_path TO "${supplier.schemaName}", public`);
      // Idempotency: compare the sale's own total against payments already
      // recorded against it. Only top up the outstanding balance.
      const rows = await qr.query(
        `SELECT COALESCE((SELECT total_amount FROM orders WHERE id = $1), 0) AS total,
                COALESCE((SELECT SUM(amount) FROM order_payments WHERE order_id = $1), 0) AS paid`,
        [order.salesOrderId],
      );
      const saleTotal = round2(Number(rows?.[0]?.total || 0));
      const alreadyPaid = round2(Number(rows?.[0]?.paid || 0));
      const remaining = round2(saleTotal - alreadyPaid);
      if (remaining <= 0.005) return; // already settled — nothing to do

      await qr.query(
        `INSERT INTO order_payments
           (id, order_id, amount, method, payment_mode, status, paid_at, notes, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'full', 'completed', now(), $4, now(), now())`,
        [order.salesOrderId, remaining, method, `Marketplace payment for ${order.orderNumber}`],
      );
      await qr.query(
        `UPDATE orders SET status = 'completed', updated_at = now() WHERE id = $1`,
        [order.salesOrderId],
      );
    } catch (error) {
      this.logger.error(
        `Failed to settle supplier sale for order ${order.orderNumber} in supplier ${order.supplierTenantId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    } finally {
      await qr.query('SET search_path TO public').catch(() => undefined);
      await qr.release();
    }
  }

  /** Fire-and-forget in-app notification to the order's counterpart. */
  private notifyCounterpart(
    toTenantId: string | null,
    order: NetworkOrder,
    title: string,
    type = 'order',
  ): void {
    if (!toTenantId) return;
    void this.appNotifications.deliverToTenant(toTenantId, {
      title,
      type,
      link: `/network/orders/${order.id}`,
    });
  }

  async list(tenantId: string, opts: { role?: OrderRole; status?: string }): Promise<any[]> {
    const qb = this.orderRepo.createQueryBuilder('o');
    if (opts.role === 'buyer') {
      qb.where('o.buyerTenantId = :t', { t: tenantId });
    } else if (opts.role === 'supplier') {
      qb.where('o.supplierTenantId = :t', { t: tenantId });
    } else {
      qb.where('(o.buyerTenantId = :t OR o.supplierTenantId = :t)', { t: tenantId });
    }
    if (opts.status) qb.andWhere('o.status = :s', { s: opts.status });
    const orders = await qb.orderBy('o.createdAt', 'DESC').getMany();

    const ids = orders.map((o) => o.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const rows = await this.itemRepo.find({ where: { orderId: In(ids) } });
      for (const r of rows) counts.set(r.orderId, (counts.get(r.orderId) || 0) + 1);
    }
    return orders.map((o) => ({
      ...o,
      role: (o.buyerTenantId === tenantId ? 'buyer' : 'supplier') as OrderRole,
      itemCount: counts.get(o.id) || 0,
    }));
  }

  async findOne(tenantId: string, id: string): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    const role = this.roleFor(order, tenantId);
    const items = await this.itemRepo.find({ where: { orderId: id }, order: { createdAt: 'ASC' } });
    return { ...order, items, role };
  }

  // --- authorization helpers ------------------------------------------------

  private roleFor(order: NetworkOrder, tenantId: string): OrderRole {
    const isBuyer = order.buyerTenantId === tenantId;
    const isSupplier =
      order.supplierTenantId === tenantId || (order.supplierTenantId == null && isBuyer);
    if (!isBuyer && !isSupplier) {
      throw new ForbiddenException('You are not a party to this order');
    }
    return isBuyer ? 'buyer' : 'supplier';
  }

  private async loadForBuyer(tenantId: string, id: string): Promise<NetworkOrder> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerTenantId !== tenantId) {
      throw new ForbiddenException('Only the buyer can perform this action');
    }
    return order;
  }

  private async loadForSupplier(tenantId: string, id: string): Promise<NetworkOrder> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    const isSupplier =
      order.supplierTenantId === tenantId ||
      (order.supplierTenantId == null && order.buyerTenantId === tenantId);
    if (!isSupplier) {
      throw new ForbiddenException('Only the supplier can perform this action');
    }
    return order;
  }

  private assertStatus(order: NetworkOrder, allowed: string[]): void {
    if (!allowed.includes(order.status)) {
      throw new BadRequestException(
        `Cannot do that from status "${order.status}" (allowed: ${allowed.join(', ')})`,
      );
    }
  }

  private async transition(
    order: NetworkOrder,
    next: string,
    byTenantId: string,
    note?: string,
  ): Promise<NetworkOrder> {
    order.status = next;
    order.statusHistory = [...(order.statusHistory || []), this.historyEntry(next, byTenantId, note)];
    await this.orderRepo.save(order);
    return order;
  }

  // --- transitions ----------------------------------------------------------

  async updateDraft(tenantId: string, id: string, dto: UpdateOrderDto): Promise<any> {
    const order = await this.loadForBuyer(tenantId, id);
    this.assertStatus(order, ['draft']);
    if (dto.note !== undefined) order.note = dto.note ?? null;
    if (dto.expectedDate !== undefined) order.expectedDate = dto.expectedDate ?? null;
    if (dto.currency !== undefined) order.currency = dto.currency || order.currency;
    await this.orderRepo.save(order);
    if (dto.items) {
      await this.itemRepo.delete({ orderId: order.id });
      await this.itemRepo.save(
        dto.items.map((i) =>
          this.itemRepo.create({
            orderId: order.id,
            description: i.description,
            quantity: i.quantity,
            unit: i.unit ?? null,
            unitPrice: i.unitPrice ?? null,
            lineTotal: this.lineTotal(i),
          }),
        ),
      );
    }
    await this.recomputeTotals(order);
    return this.findOne(tenantId, id);
  }

  async submit(tenantId: string, id: string): Promise<any> {
    const order = await this.loadForBuyer(tenantId, id);
    this.assertStatus(order, ['draft']);
    await this.transition(order, 'requested', tenantId);
    return this.findOne(tenantId, id);
  }

  async cancel(tenantId: string, id: string, dto: OrderActionDto): Promise<any> {
    const order = await this.loadForBuyer(tenantId, id);
    // Only cancellable BEFORE the supplier accepts. Once accepted the supplier's
    // stock is already debited and the sale completed; cancelling here would
    // leave stock/COGS/AR un-reversed (the D7 bug). A post-accept unwind needs a
    // dedicated return/refund flow, not a silent cancel.
    this.assertStatus(order, ['draft', 'requested']);
    await this.transition(order, 'cancelled', tenantId, dto.note);
    return this.findOne(tenantId, id);
  }

  async accept(tenantId: string, id: string, dto: OrderActionDto): Promise<any> {
    const order = await this.loadForSupplier(tenantId, id);
    this.assertStatus(order, ['requested']);
    if (dto.items?.length) {
      for (const adj of dto.items) {
        if (!adj.id || adj.unitPrice === undefined) continue;
        const item = await this.itemRepo.findOne({ where: { id: adj.id, orderId: order.id } });
        if (item) {
          item.unitPrice = adj.unitPrice;
          item.lineTotal = this.lineTotal({ quantity: item.quantity, unitPrice: adj.unitPrice });
          await this.itemRepo.save(item);
        }
      }
      await this.recomputeTotals(order);
    }

    // Debit stock NOW (check-at-accept). Preferred path: FULFIL the PENDING sale
    // that was written to the seller's table at checkout (one record, one URL) by
    // picking the fulfilment branch. Fallback: materialize one for legacy /
    // off-catalog orders that were never pre-created. Either path debits
    // multi-branch FIFO stock and throws on shortfall — we let it propagate so
    // the order stays 'requested' (no half-accepted state). Idempotent: a
    // non-pending sale is a no-op, safe to retry after a mid-transition failure.
    if (order.salesOrderId) {
      const branches = await this.branchRepo.find({
        where: { isActive: true },
        order: { isDefault: 'DESC', createdAt: 'ASC' },
      });
      const branch = (dto.branchId && branches.find((b) => b.id === dto.branchId)) || branches[0];
      if (!branch) {
        throw new BadRequestException(
          'No active branch to fulfil this order from — set up a branch before accepting orders',
        );
      }
      await this.rmsOrdersService.fulfil(order.salesOrderId, branch.id);
    } else {
      await this.materializeSalesOrder(order, dto.branchId);
    }

    await this.transition(order, 'accepted', tenantId, dto.note);
    this.notifyCounterpart(order.buyerTenantId, order, `Order ${order.orderNumber} accepted`);
    // Bridge to Sales: draft a supplier-side invoice to the buyer.
    await this.createSalesInvoiceForOrder(order);
    return this.findOne(tenantId, id);
  }

  /**
   * On accept, turn the incoming marketplace order into a REAL sales order in
   * the supplier's tenant (full POS detail: multi-branch FIFO stock debit,
   * COGS/profit, stock ledger). Runs in the supplier's request/tenant context.
   *
   * Idempotent: once `salesOrderId` is set we never create a second sale.
   * Enforcement: if OrdersService.create throws (insufficient stock), it
   * propagates out of accept() so the order is NOT transitioned.
   */
  private async materializeSalesOrder(order: NetworkOrder, branchId?: string): Promise<void> {
    if (order.salesOrderId) return; // already materialized — no double sale

    const items = await this.itemRepo.find({ where: { orderId: order.id } });
    // Only lines mapped to one of the supplier's inventory items can debit
    // stock. Off-catalog / free-text lines can't be fulfilled as a real sale.
    const saleItems = items
      .filter((i) => i.sourceInventoryItemId)
      .map((i) => ({
        inventoryItemId: i.sourceInventoryItemId as string,
        quantity: Number(i.quantity),
      }));
    if (!saleItems.length) return; // nothing stock-backed — draft-invoice bridge still covers AR

    // Seller's fulfilment branch: the one the seller picked (must be active),
    // else prefer the default, else the first active one.
    const branches = await this.branchRepo.find({
      where: { isActive: true },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
    const branch = (branchId && branches.find((b) => b.id === branchId)) || branches[0];
    if (!branch) {
      throw new BadRequestException(
        'No active branch to fulfil this order from — set up a branch before accepting network orders',
      );
    }

    const sale = await this.rmsOrdersService.create(branch.id, {
      branchId: branch.id,
      type: 'marketplace',
      customerName: order.buyerName,
      items: saleItems,
    });
    order.salesOrderId = (sale as { id?: string })?.id ?? null;
    await this.orderRepo.save(order);
  }

  /**
   * On accept, create a DRAFT sales invoice in the supplier's tenant to the
   * buyer (materialized as a Customer via the partnership). Runs in the
   * supplier's request/tenant context. Best-effort — never fails the accept;
   * the supplier reviews and sends it from Sales → Invoices.
   */
  private async createSalesInvoiceForOrder(order: NetworkOrder): Promise<void> {
    if (order.salesInvoiceId) return;
    try {
      const customer = await this.customerRepo.findOne({
        where: { linkedTenantId: order.buyerTenantId },
      });
      if (!customer) return; // buyer isn't a materialized customer — skip quietly
      const items = await this.itemRepo.find({ where: { orderId: order.id } });
      if (!items.length) return;
      const issue = new Date();
      const due = new Date(issue.getTime() + 14 * 24 * 60 * 60 * 1000);
      const invoice = await this.invoicesService.create({
        customerId: customer.id,
        issueDate: issue.toISOString().slice(0, 10),
        dueDate: due.toISOString().slice(0, 10),
        currency: order.currency,
        notes: `Auto-created from network order ${order.orderNumber}`,
        lines: items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice || 0),
        })),
      });
      const invoiceId = (invoice as { id?: string })?.id ?? null;
      order.salesInvoiceId = invoiceId;
      await this.orderRepo.save(order);
      // Tag the invoice as order-managed so its payment can't be recorded
      // manually — it settles through the order flow.
      if (invoiceId) {
        await this.invoiceRepo.update({ id: invoiceId }, { networkOrderId: order.id });
      }
    } catch (error) {
      this.logger.error(
        `Failed to auto-create sales invoice for order ${order.orderNumber}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  async reject(tenantId: string, id: string, dto: OrderActionDto): Promise<any> {
    const order = await this.loadForSupplier(tenantId, id);
    this.assertStatus(order, ['requested']);
    // Decline: drop the PENDING sale off the seller's table (no stock moved yet).
    // Runs in the seller's tenant context, so it targets the seller's schema.
    if (order.salesOrderId) {
      await this.rmsOrdersService.cancelIfPending(order.salesOrderId);
    }
    await this.transition(order, 'rejected', tenantId, dto.note);
    return this.findOne(tenantId, id);
  }

  /** Supplier marks the order in transit + records the delivery method/details. */
  async ship(tenantId: string, id: string, dto: ShipOrderDto): Promise<any> {
    const order = await this.loadForSupplier(tenantId, id);
    this.assertStatus(order, ['accepted']);

    order.deliveryMethod = dto.deliveryMethod;
    const info: Record<string, string> = {};
    if (dto.deliveryMethod === 'shipment') {
      if (dto.shipmentCompany) info.shipmentCompany = dto.shipmentCompany;
      if (dto.trackingNumber) info.trackingNumber = dto.trackingNumber;
    } else if (dto.deliveryMethod === 'dispatch') {
      if (dto.riderName) info.riderName = dto.riderName;
      if (dto.riderPhone) info.riderPhone = dto.riderPhone;
    } else if (dto.deliveryMethod === 'pickup') {
      if (dto.pickupContact) info.pickupContact = dto.pickupContact;
    }
    order.deliveryInfo = Object.keys(info).length ? info : null;
    await this.orderRepo.save(order);

    const detail = [dto.trackingNumber, dto.riderName, dto.pickupContact].filter(Boolean).join(' ');
    const noteParts = [`Via ${dto.deliveryMethod}`, detail, dto.note].filter(Boolean);
    await this.transition(order, 'shipped', tenantId, noteParts.join(' · ') || undefined);
    this.notifyCounterpart(
      order.buyerTenantId,
      order,
      `Order ${order.orderNumber} is in transit (${dto.deliveryMethod})`,
    );
    return this.findOne(tenantId, id);
  }

  async receive(tenantId: string, id: string, dto: ReceiveOrderDto): Promise<any> {
    const order = await this.loadForBuyer(tenantId, id);
    // Idempotent: an already-received order is a no-op — never double-link the
    // inflow or re-transition (a retried receive must be safe).
    if (order.status === 'received') return this.findOne(tenantId, id);
    this.assertStatus(order, ['accepted', 'shipped']);

    // PURCHASE bridge: stock is booked through the robust "Receive Stock"
    // (Purchases) flow, which creates the inflow then links it here. Set once.
    if (dto.inflowId && !order.receivedInflowId) order.receivedInflowId = dto.inflowId;
    await this.transition(order, 'received', tenantId, dto.note);
    this.notifyCounterpart(order.supplierTenantId, order, `Order ${order.orderNumber} received`);
    return this.findOne(tenantId, id);
  }

  /**
   * Buyer settles the order — either by an internal wallet transfer to the
   * supplier (IOU ledger) or by marking it paid externally. Idempotent: a
   * second call on an already-paid order is a no-op.
   */
  async pay(tenantId: string, id: string, dto: PayOrderDto): Promise<any> {
    const order = await this.loadForBuyer(tenantId, id);
    if (order.paymentStatus === 'paid') return this.findOne(tenantId, id);

    const total = Number(order.total || 0);
    const amount = dto.amount != null ? Number(dto.amount) : total;

    // This flow settles an order in FULL — reject a short payment rather than
    // marking the order paid/claimed for less than it's owed (0.005 tolerance
    // for float rounding).
    if (amount + 0.005 < total) {
      throw new BadRequestException(
        'Partial payments are not supported — pay the full order total.',
      );
    }

    if (dto.method === 'wallet') {
      if (!order.supplierTenantId) {
        throw new BadRequestException(
          'Wallet payment needs an on-platform supplier — use "mark as paid" for off-platform suppliers',
        );
      }
      if (!(total > 0)) throw new BadRequestException('Nothing to pay on this order');
      await this.walletService.transfer({
        payerTenantId: tenantId,
        payeeTenantId: order.supplierTenantId,
        amount: total,
        reference: `order:${order.id}`,
        note: `Payment for ${order.orderNumber}`,
        payerName: order.buyerName,
        payeeName: order.supplierName,
      });
      // Wallet = real money moved internally → paid immediately.
      order.paymentMethod = 'wallet';
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      await this.orderRepo.save(order);
      // Reconcile the supplier's own sale so it stops reading as unpaid (D5).
      await this.settleSupplierSale(order, 'wallet');
      this.notifyCounterpart(order.supplierTenantId, order, `Order ${order.orderNumber} paid`, 'payment');
    } else {
      // External / off-platform: the buyer only CLAIMS payment. It is NOT paid
      // until the supplier confirms they actually received the money (buyers can
      // lie), via confirmPayment. Only wallet transfers auto-settle.
      order.paymentMethod = 'external';
      order.paymentStatus = 'claimed';
      await this.orderRepo.save(order);
      this.notifyCounterpart(
        order.supplierTenantId,
        order,
        `${order.buyerName} marked ${order.orderNumber} as paid — confirm you received it`,
        'payment',
      );
    }

    return this.findOne(tenantId, id);
  }

  /**
   * Supplier confirms (or disputes) an externally-claimed payment. Only a
   * 'claimed' order can be resolved here: accept → paid, reject → back to unpaid.
   */
  async confirmPayment(tenantId: string, id: string, dto: ConfirmPaymentDto): Promise<any> {
    const order = await this.loadForSupplier(tenantId, id);
    if (order.paymentStatus !== 'claimed') {
      throw new BadRequestException('Only a claimed (externally-paid) order can be confirmed');
    }
    if (dto.accept) {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      await this.orderRepo.save(order);
      // External payment confirmed by the supplier → record it on their sale (D5).
      await this.settleSupplierSale(order, 'transfer');
      this.notifyCounterpart(order.buyerTenantId, order, `Payment for ${order.orderNumber} confirmed`, 'payment');
    } else {
      order.paymentStatus = 'unpaid';
      order.paymentMethod = null;
      await this.orderRepo.save(order);
      this.notifyCounterpart(
        order.buyerTenantId,
        order,
        `Payment for ${order.orderNumber} was not confirmed${dto.note ? `: ${dto.note}` : ''}`,
        'payment',
      );
    }
    return this.findOne(tenantId, id);
  }
}
