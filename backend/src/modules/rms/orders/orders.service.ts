import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import { Transactional } from "typeorm-transactional";
import { Order } from "../entities/order.entity";
import { OrderItem } from "../entities/order-item.entity";
import { OrderPayment } from "../entities/order-payment.entity";
import { OrderItemInflowItem } from "../entities/order-item-inflow-item.entity";
import { InventoryItem } from "../../ims/entities/inventory-item.entity";
import { InventoryItemComponent } from "../../ims/entities/inventory-item-component.entity";
import { InventoryInflowItem } from "../../ims/entities/inventory-inflow-item.entity";
import { BranchInventoryItem } from "../../ims/entities/branch-inventory-item.entity";
import {
  StockMovement,
  StockMovementType,
} from "../../ims/entities/stock-movement.entity";
import { Supplier } from "../entities/supplier.entity";
import { Branch } from "../../../common/entities/branch.entity";
import { Business } from "../../../common/entities/business.entity";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { MarkPaidDto } from "./dto/mark-paid.dto";
import { UomConversionsService } from "../../ims/uom-conversions/uom-conversions.service";
import { Uom } from "../../ims/entities/uom.entity";
import { PostingService } from "../../accounting/posting.service";

/**
 * A normalized order line ready to persist: the OrderItem plus the batch
 * allocations (for OrderItemInflowItem rows) and the per-inventory-item stock
 * deductions. A raw item has one deduction; a dish has one per ingredient.
 */
interface BuiltOrderLine {
  item: OrderItem;
  allocations: Array<{
    inflowItemId: string;
    quantityUsed: number;
    costPerUnit: number;
    totalCost: number;
    /** Source branch of this inflow batch (multi-branch FIFO). */
    branchId: string;
  }>;
  deductions: Array<{
    inventoryItemId: string;
    /** Branch to decrement — deductions are per (item, source branch). */
    branchId: string;
    baseQty: number;
    costPrice: number;
  }>;
  totalPrice: number;
  costTotal: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderPayment)
    private orderPaymentRepository: Repository<OrderPayment>,
    @InjectRepository(OrderItemInflowItem)
    private orderItemInflowItemRepository: Repository<OrderItemInflowItem>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryItemComponent)
    private inventoryItemComponentRepository: Repository<InventoryItemComponent>,
    @InjectRepository(InventoryInflowItem)
    private inflowItemRepository: Repository<InventoryInflowItem>,
    @InjectRepository(BranchInventoryItem)
    private branchInventoryRepository: Repository<BranchInventoryItem>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    private uomConversionsService: UomConversionsService,
    private dataSource: DataSource,
    private postingService: PostingService,
  ) {}

  /**
   * Resolve the tenant's configured inventory outflow allocation method.
   * Falls back to FIFO when unset. (One business per tenant schema.)
   */
  private async getAllocationMethod(): Promise<"FIFO" | "LIFO" | "FEFO"> {
    const business = await this.businessRepository.findOne({ where: {} });
    const method = (business?.allocationMethod || "FIFO").toUpperCase();
    return method === "LIFO" || method === "FEFO" ? method : "FIFO";
  }

  /**
   * Allocate inventory from inflows based on allocation method
   * Actually picks specific inflow items and calculates allocation details
   * Returns allocation details including which inflow items were used
   */
  private async allocateInventory(
    branchId: string,
    inventoryItemId: string,
    quantityBase: number,
    allocationMethod: string,
  ): Promise<{
    costPrice: number;
    costTotal: number;
    allocations: Array<{
      inflowItemId: string;
      quantityUsed: number;
      costPerUnit: number;
      totalCost: number;
      /** The branch this inflow batch was drawn from (multi-branch FIFO). */
      branchId: string;
    }>;
  }> {

    // Get all inflow items for this inventory item in the specific branch only
    // Use raw SQL query because TypeORM query builder with joins doesn't reliably translate property names

    // Multi-branch FIFO: draw from the order's OWN branch first (fully), then
    // spill to other branches. `(item.branch_id = $2) DESC` puts the home
    // branch's rows first; the method order applies within each branch tier.
    const branchPriority = "(item.branch_id = $2) DESC";
    let orderByClause = "";
    if (allocationMethod === "FEFO") {
      orderByClause = `ORDER BY ${branchPriority}, item.expiry_date ASC NULLS LAST, item.created_at ASC`;
    } else if (allocationMethod === "LIFO") {
      orderByClause = `ORDER BY ${branchPriority}, item.created_at DESC`;
    } else {
      // FIFO (default)
      orderByClause = `ORDER BY ${branchPriority}, item.created_at ASC`;
    }

    // Multi-branch FIFO: query this item's inflow batches across ALL branches,
    // ordered home-branch-first (see branchPriority) then by the allocation
    // method. The greedy loop below consumes the home branch fully before
    // spilling to others, so single-branch sales are unchanged.
    // FOR UPDATE OF item: pessimistically locks EVERY candidate inflow row
    // (across branches) so concurrent orders can't double-allocate the same
    // remaining quantity (audit C-INV-4). Runs on the request's transaction.
    const query = `
      SELECT item.*
      FROM inventory_inflow_items item
      INNER JOIN inventory_inflows inflow ON item.inflow_id = inflow.id
      WHERE item.inventory_item_id = $1
      ${orderByClause}
      FOR UPDATE OF item
    `;

    const rawItems = await this.inflowItemRepository.query(query, [
      inventoryItemId,
      branchId,
    ]);

    // Load full entities from the IDs
    const itemIds = rawItems.map((item: any) => item.id);
    let inflowItems: any[] = [];
    if (itemIds.length > 0) {
      inflowItems = await this.inflowItemRepository.find({
        where: { id: In(itemIds) },
        order:
          allocationMethod === "FEFO"
            ? { expiryDate: "ASC", createdAt: "ASC" }
            : allocationMethod === "LIFO"
              ? { createdAt: "DESC" }
              : { createdAt: "ASC" },
      });
      // Home-branch-first priority (the DB `order` above can't express it, and
      // the greedy loop relies on ordering to spill only after home is depleted).
      inflowItems.sort((a, b) => {
        const ah = a.branchId === branchId ? 0 : 1;
        const bh = b.branchId === branchId ? 0 : 1;
        if (ah !== bh) return ah - bh;
        if (allocationMethod === "LIFO") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (allocationMethod === "FEFO") {
          const ae = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
          const be = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
          if (ae !== be) return ae - be;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }

    // Log details of each inflow item found
    inflowItems.forEach((item, index) => {
    });

    if (inflowItems.length === 0) {
      throw new BadRequestException(
        `No inventory available for this item in any branch. Please receive stock before selling.`,
      );
    }

    // Calculate how much has already been sold from each inflow item
    // FIFO allocation: Use first inflow until exhausted, then move to next
    // This creates separate batches (OrderItemInflowItem records) for each inflow used
    const allocations: Array<{
      inflowItemId: string;
      quantityUsed: number;
      costPerUnit: number;
      totalCost: number;
      branchId: string;
    }> = [];

    let remainingQuantity = quantityBase;

    // FIFO: Process inflows in order (oldest first), using each until exhausted
    for (const inflowItem of inflowItems) {
      if (remainingQuantity <= 0) break;

      // Calculate remaining quantity for this inflow item
      // Sum all quantityUsed from OrderItemInflowItem records for this inflow item
      const soldQuery = `
          SELECT COALESCE(SUM(quantity_used), 0) as total_sold
          FROM order_item_inflow_items
          WHERE inflow_item_id = $1
        `;
      const soldResult = await this.orderItemInflowItemRepository.query(
        soldQuery,
        [inflowItem.id],
      );
      const totalSold = Number(soldResult[0]?.total_sold || 0);
      const availableQuantity = Math.max(
        0,
        Number(inflowItem.baseQuantity || 0) - totalSold,
      );

      if (availableQuantity > 0) {
        const quantityToUse = Math.min(remainingQuantity, availableQuantity);
        // IMPORTANT: Use inflow item's unitCost (cost price from when item was received)
        // NOT the sales price - this ensures accurate cost tracking and profit calculation
        const costPerUnit = Number(inflowItem.unitCost || 0);
        const totalCost = quantityToUse * costPerUnit;

        allocations.push({
          inflowItemId: inflowItem.id,
          quantityUsed: quantityToUse,
          costPerUnit,
          totalCost: Math.round(totalCost * 100) / 100,
          branchId: inflowItem.branchId,
        });

        remainingQuantity -= quantityToUse;
      }
    }

    if (allocations.length === 0) {
      throw new BadRequestException(
        `All inventory for this item has been sold out across your branches. Please restock or reduce the quantity.`,
      );
    }

    // Check if we could fulfill the full requested quantity
    if (remainingQuantity > 0) {
      const allocatedQuantity = quantityBase - remainingQuantity;
      throw new BadRequestException(
        `Insufficient inventory in this branch. Requested: ${quantityBase}, Available: ${allocatedQuantity}. Please restock or reduce the quantity.`,
      );
    }

    // Calculate weighted average cost
    const totalCost = allocations.reduce(
      (sum, alloc) => sum + alloc.totalCost,
      0,
    );
    const costPrice = quantityBase > 0 ? totalCost / quantityBase : 0;

    return {
      costPrice: Math.round(costPrice * 100) / 100,
      costTotal: Math.round(totalCost * 100) / 100,
      allocations,
    };
  }

  /**
   * Build one order line for a raw inventory item (retail-style: the thing you
   * sell IS the thing you stocked). Deducts that item's own FIFO batches.
   */
  private async buildInventoryLine(
    branchId: string,
    line: { inventoryItemId?: string; uomId?: string; quantity: number },
    allocationMethod: string,
  ): Promise<BuiltOrderLine> {
    const inventoryItem = await this.inventoryItemRepository.findOne({
      where: { id: line.inventoryItemId },
      relations: ["baseUom"],
    });
    if (!inventoryItem) {
      throw new NotFoundException(
        `Inventory item with ID ${line.inventoryItemId} not found`,
      );
    }

    const uomId = line.uomId;
    const baseUomId = inventoryItem.baseUomId;
    const basePrice = Number(inventoryItem.salePrice) || 0;
    const quantity = Number(line.quantity);

    let unitPrice = basePrice;
    let quantityBase = quantity;
    if (uomId && uomId !== baseUomId) {
      const multiplier = await this.uomConversionsService.getMultiplier(
        uomId,
        baseUomId,
      );
      if (multiplier !== null && multiplier > 0) {
        unitPrice = basePrice * multiplier;
        quantityBase = quantity * multiplier;
      }
    }

    const totalPrice = unitPrice * quantity;

    // The one selling rule:
    //  1. item has make-up → deplete each component (each per its own trackable);
    //  2. no make-up + trackable → deplete itself (1:1);
    //  3. no make-up + not trackable → sell freely, no deduction (cost = manual).
    const components = await this.inventoryItemComponentRepository.find({
      where: { parentItemId: line.inventoryItemId },
    });

    const allocations: BuiltOrderLine["allocations"] = [];
    const deductions: BuiltOrderLine["deductions"] = [];
    let costTotal = 0;

    if (components.length > 0) {
      for (const comp of components) {
        const compItem = await this.inventoryItemRepository.findOne({
          where: { id: comp.componentItemId },
          relations: ["baseUom"],
        });
        if (!compItem) {
          throw new NotFoundException(
            `Component item ${comp.componentItemId} not found`,
          );
        }
        // Component quantity per one BASE unit of the parent, in the component's
        // base UoM, scaled by how many base units of the parent are being sold.
        let perParentBase = Number(comp.quantity) || 0;
        if (comp.uomId && comp.uomId !== compItem.baseUomId) {
          const m = await this.uomConversionsService.getMultiplier(
            comp.uomId,
            compItem.baseUomId,
          );
          if (m !== null && m > 0) perParentBase = Number(comp.quantity) * m;
        }
        const requiredBase = perParentBase * quantityBase;
        if (requiredBase <= 0) continue;

        if (compItem.isTrackable === false) {
          // Untracked ingredient: never blocks, no stock movement; cost from its
          // manual unit cost.
          costTotal += (Number(compItem.unitCost) || 0) * requiredBase;
          continue;
        }
        const alloc = await this.allocateInventory(
          branchId,
          comp.componentItemId,
          requiredBase,
          allocationMethod,
        );
        allocations.push(...alloc.allocations);
        // Deductions are per (item, source branch) so cross-branch draws
        // decrement each branch's own on-hand.
        const compByBranch = new Map<string, number>();
        for (const a of alloc.allocations) {
          compByBranch.set(a.branchId, (compByBranch.get(a.branchId) || 0) + a.quantityUsed);
        }
        for (const [bId, qty] of compByBranch) {
          deductions.push({
            inventoryItemId: comp.componentItemId,
            branchId: bId,
            baseQty: qty,
            costPrice: alloc.costPrice,
          });
        }
        costTotal += alloc.costTotal;
      }
    } else if (inventoryItem.isTrackable !== false) {
      const alloc = await this.allocateInventory(
        branchId,
        line.inventoryItemId!,
        quantityBase,
        allocationMethod,
      );
      allocations.push(...alloc.allocations);
      // Per (item, source branch) so cross-branch draws decrement each branch.
      const byBranch = new Map<string, number>();
      for (const a of alloc.allocations) {
        byBranch.set(a.branchId, (byBranch.get(a.branchId) || 0) + a.quantityUsed);
      }
      for (const [bId, qty] of byBranch) {
        deductions.push({
          inventoryItemId: line.inventoryItemId!,
          branchId: bId,
          baseQty: qty,
          costPrice: alloc.costPrice,
        });
      }
      costTotal += alloc.costTotal;
    } else {
      // Non-trackable simple item: sell freely; cost from its manual unit cost.
      costTotal += (Number(inventoryItem.unitCost) || 0) * quantityBase;
    }

    costTotal = Math.round(costTotal * 100) / 100;
    const costPrice =
      quantityBase > 0 ? Math.round((costTotal / quantityBase) * 100) / 100 : 0;

    return {
      item: this.orderItemRepository.create({
        inventoryItemId: line.inventoryItemId,
        menuItemId: null,
        name: inventoryItem.name,
        quantity,
        quantityBase,
        unitPrice,
        totalPrice,
        costPrice,
        costTotal,
        uomId: uomId ?? null,
      }),
      allocations,
      deductions,
      totalPrice,
      costTotal,
    };
  }

  /**
   * Runs the whole order (order + items + allocations + stock deduction +
   * stock ledger movements) in one transaction (audit C-INV-3).
   */
  @Transactional()
  async create(
    branchId: string,
    createOrderDto: CreateOrderDto,
    actor?: { id?: string; name?: string },
  ) {

    try {
      // Generate shorter order number: ORD-{last8digitsoftimestamp}{4randomchars}
      // e.g., ORD-09292771K8M2 (17 chars vs previous 30+ chars)
      const timestamp = Date.now().toString();
      const shortTimestamp = timestamp.slice(-8); // Last 8 digits
      const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase();
      const orderNumber = `ORD-${shortTimestamp}${randomPart}`;

      // Resolve the tenant's configured allocation method (FIFO/LIFO/FEFO).
      const allocationMethod = await this.getAllocationMethod();

      // Build each order line from its inventory item (1:1). Composed items
      // (make-up / BOM) are layered onto buildInventoryLine in a later phase.
      const orderItemsWithAllocations = await Promise.all(
        createOrderDto.items.map((line) =>
          this.buildInventoryLine(branchId, line, allocationMethod),
        ),
      );

      // Order totals from the built lines.
      let subtotal = 0;
      let totalCost = 0;
      for (const built of orderItemsWithAllocations) {
        subtotal += built.totalPrice;
        totalCost += built.costTotal;
      }

      // Calculate VAT if enabled
      const applyVat = createOrderDto.applyVat || false;
      const vatPercentage = applyVat ? createOrderDto.vatPercentage || 7.5 : 0;
      const tax = applyVat ? (subtotal * vatPercentage) / 100 : 0;
      const totalAmount = subtotal + tax;
      const profit = subtotal - totalCost;

      const order = this.orderRepository.create({
        branchId,
        tableId: createOrderDto.tableId || null,
        orderNumber,
        subtotal,
        tax,
        totalAmount,
        totalCost,
        profit,
        allocationMethod,
        status: "pending",
        notes: createOrderDto.notes || null,
        customerName: createOrderDto.customerName || null,
        customerPhone: createOrderDto.customerPhone || null,
        orderType: createOrderDto.type || "dine_in",
        createdBy: actor?.id || null,
        createdByName: actor?.name || null,
        updatedBy: actor?.id || null,
        updatedByName: actor?.name || null,
      });

      const savedOrder = await this.orderRepository.save(order);

      // Save order items, create allocation tracking records, and update stock.
      for (const { item: itemEntity, allocations, deductions } of
        orderItemsWithAllocations) {
        itemEntity.orderId = savedOrder.id;
        const savedOrderItem = await this.orderItemRepository.save(itemEntity);

        // Track which inflow batches were consumed (across all ingredients for
        // a dish line). The junction references inflow items, so a dish's rows
        // may span several inventory items — that's expected.
        for (const allocation of allocations) {
          const orderItemInflowItem = this.orderItemInflowItemRepository.create(
            {
              orderItemId: savedOrderItem.id,
              inflowItemId: allocation.inflowItemId,
              quantityUsed: allocation.quantityUsed,
              costPerUnit: allocation.costPerUnit,
              totalCost: allocation.totalCost,
              branchId: allocation.branchId,
            },
          );
          await this.orderItemInflowItemRepository.save(orderItemInflowItem);
        }

        // Deduct stock for every inventory item this line consumes: exactly one
        // for a raw item, one per ingredient for a dish. Each deduction updates
        // both counters (item + branch) under lock and writes a SALE movement.
        for (const deduction of deductions) {
          const deductQty = Number(deduction.baseQty || 0);
          // Multi-branch FIFO: decrement the SOURCE branch this portion was
          // drawn from (may differ from the order's branch when it spilled over).
          const sourceBranchId = deduction.branchId || branchId;

          // Update item-level stock (locked read; negative stock forbidden — C-INV-4)
          const inventoryItem = await this.inventoryItemRepository
            .createQueryBuilder("item")
            .setLock("pessimistic_write")
            .where("item.id = :id", { id: deduction.inventoryItemId })
            .getOne();

          if (inventoryItem) {
            const available = Number(inventoryItem.currentStock || 0);
            if (available < deductQty) {
              throw new BadRequestException(
                `Insufficient stock for ${inventoryItem.name}. Available: ${available}, requested: ${deductQty}`,
              );
            }
            inventoryItem.currentStock = available - deductQty;
            await this.inventoryItemRepository.save(inventoryItem);
          }

          // Update branch inventory (locked read; negative stock forbidden)
          const branchInventory = await this.branchInventoryRepository
            .createQueryBuilder("branchItem")
            .setLock("pessimistic_write")
            .where(
              "branchItem.branchId = :branchId AND branchItem.inventoryItemId = :itemId",
              { branchId: sourceBranchId, itemId: deduction.inventoryItemId },
            )
            .getOne();

          // Branch counter must move in lockstep with the item counter; a missing
          // branch row while deducting from that branch would silently diverge the
          // two stock sources of truth — refuse rather than skip.
          if (!branchInventory) {
            throw new BadRequestException(
              `No stock record for ${inventoryItem?.name || itemEntity.name} in the source branch — cannot sell without diverging branch and item stock.`,
            );
          }
          const branchAvailable = Number(branchInventory.currentStock || 0);
          if (branchAvailable < deductQty) {
            throw new BadRequestException(
              `Insufficient stock for ${inventoryItem?.name || itemEntity.name} in the source branch. Available: ${branchAvailable}, requested: ${deductQty}`,
            );
          }
          branchInventory.currentStock = branchAvailable - deductQty;
          await this.branchInventoryRepository.save(branchInventory);

          // Immutable stock ledger entry (roadmap I1): one SALE movement per
          // consumed inventory item, in the same transaction as the deduction.
          if (inventoryItem) {
            const stockMovementRepository =
              this.dataSource.getRepository(StockMovement);
            await stockMovementRepository.save(
              stockMovementRepository.create({
                itemId: deduction.inventoryItemId,
                branchId: sourceBranchId,
                movementType: StockMovementType.SALE,
                quantity: -deductQty,
                unitCost:
                  deduction.costPrice != null
                    ? Number(deduction.costPrice)
                    : null,
                sourceType: "order",
                sourceId: savedOrder.id,
                balanceAfter: Number(inventoryItem.currentStock),
              }),
            );
          }
        }
      }

      // Double-entry posting for the sale (audit A5): revenue + tax and COGS
      // against inventory, in the same transaction as the stock deduction.
      // Idempotent per order id. RMS orders are treated as cash sales.
      if (subtotal > 0) {
        await this.postingService.postSale({
          sourceType: "order",
          sourceId: savedOrder.id,
          revenue: subtotal,
          cogs: totalCost,
          tax,
          isCash: true,
          memo: `Order ${orderNumber}`,
        });
      }

      // Use findOne method which properly loads relations
      return await this.findOne(savedOrder.id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Marketplace sale created in a PENDING state — order + lines are recorded but
   * NO stock is debited yet. The seller fulfils it later via fulfil(), choosing a
   * branch. Kept SEPARATE from create() so the live POS path is never touched.
   */
  @Transactional()
  async createPendingSale(
    branchId: string,
    dto: CreateOrderDto,
    actor?: { id?: string; name?: string },
  ) {
    const ts = Date.now().toString();
    const orderNumber = `ORD-${ts.slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const allocationMethod = await this.getAllocationMethod();

    const lines: Array<{ inventoryItemId: string; name: string; quantity: number; uomId: string | null; unitPrice: number }> = [];
    let subtotal = 0;
    for (const line of dto.items) {
      const inv = await this.inventoryItemRepository.findOne({ where: { id: line.inventoryItemId } });
      const rawPrice = Number((line as unknown as { unitPrice?: number }).unitPrice);
      const unitPrice = Number.isFinite(rawPrice) ? rawPrice : Number(inv?.salePrice || 0);
      const quantity = Number(line.quantity);
      subtotal += unitPrice * quantity;
      lines.push({ inventoryItemId: line.inventoryItemId, name: inv?.name || 'Item', quantity, uomId: line.uomId || null, unitPrice });
    }
    subtotal = Math.round(subtotal * 100) / 100;

    const savedOrder = await this.orderRepository.save(
      this.orderRepository.create({
        branchId,
        orderNumber,
        subtotal,
        tax: 0,
        totalAmount: subtotal,
        totalCost: 0,
        profit: 0,
        allocationMethod,
        status: 'pending',
        orderType: dto.type || 'marketplace',
        customerName: dto.customerName || null,
        createdBy: actor?.id || null,
        createdByName: actor?.name || null,
      }),
    );

    for (const l of lines) {
      await this.orderItemRepository.save(
        this.orderItemRepository.create({
          orderId: savedOrder.id,
          inventoryItemId: l.inventoryItemId,
          name: l.name,
          quantity: l.quantity,
          quantityBase: l.quantity,
          uomId: l.uomId,
          unitPrice: l.unitPrice,
          totalPrice: Math.round(l.unitPrice * l.quantity * 100) / 100,
          costPrice: 0,
          costTotal: 0,
        }),
      );
    }
    return this.findOne(savedOrder.id);
  }

  /**
   * Fulfil a PENDING marketplace sale: allocate FIFO stock from `branchId` (the
   * seller's chosen fulfilment branch), debit stock, record the batch breakdown +
   * double-entry, and set status 'completed'. Reuses the SAME allocator as
   * create(); create() itself is untouched. Throws on insufficient stock (the
   * order stays pending). Idempotent — a non-pending order is a no-op.
   */
  @Transactional()
  async fulfil(orderId: string, branchId: string, actor?: { id?: string; name?: string }) {
    // Lock the order row FOR UPDATE before checking status, so two concurrent
    // fulfils/accepts can't both pass the 'pending' check and double-debit stock.
    const order = await this.orderRepository
      .createQueryBuilder('o')
      .setLock('pessimistic_write')
      .where('o.id = :id', { id: orderId })
      .getOne();
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'pending') return this.findOne(orderId); // already fulfilled/closed

    const items = await this.orderItemRepository.find({ where: { orderId } });
    // Resolve in the seller's live context (fulfil runs in the seller tenant),
    // not from the placeholder stored when the pending sale was created.
    const allocationMethod = await this.getAllocationMethod();
    const stockMovementRepository = this.dataSource.getRepository(StockMovement);
    let totalCost = 0;

    for (const item of items) {
      if (!item.inventoryItemId) continue;
      const baseQty = Number(item.quantityBase || item.quantity || 0);
      if (baseQty <= 0) continue;

      const alloc = await this.allocateInventory(branchId, item.inventoryItemId, baseQty, allocationMethod);

      for (const a of alloc.allocations) {
        await this.orderItemInflowItemRepository.save(
          this.orderItemInflowItemRepository.create({
            orderItemId: item.id,
            inflowItemId: a.inflowItemId,
            quantityUsed: a.quantityUsed,
            costPerUnit: a.costPerUnit,
            totalCost: a.totalCost,
            branchId: a.branchId,
          }),
        );
      }

      // Deduct per source branch (allocations may span branches on shortfall).
      const byBranch = new Map<string, number>();
      for (const a of alloc.allocations) byBranch.set(a.branchId, (byBranch.get(a.branchId) || 0) + Number(a.quantityUsed));
      for (const [srcBranch, qty] of byBranch) {
        const inventoryItem = await this.inventoryItemRepository
          .createQueryBuilder('item')
          .setLock('pessimistic_write')
          .where('item.id = :id', { id: item.inventoryItemId })
          .getOne();
        if (inventoryItem) {
          const available = Number(inventoryItem.currentStock || 0);
          if (available < qty) throw new BadRequestException(`Insufficient stock for ${inventoryItem.name}. Available: ${available}, requested: ${qty}`);
          inventoryItem.currentStock = available - qty;
          await this.inventoryItemRepository.save(inventoryItem);
        }
        const branchInventory = await this.branchInventoryRepository
          .createQueryBuilder('bi')
          .setLock('pessimistic_write')
          .where('bi.branchId = :b AND bi.inventoryItemId = :i', { b: srcBranch, i: item.inventoryItemId })
          .getOne();
        // Branch counter MUST move in lockstep with the item counter. A missing
        // branch row while deducting from that branch would silently diverge the
        // two stock sources of truth — refuse rather than skip.
        if (!branchInventory) {
          throw new BadRequestException(
            `No stock record for ${inventoryItem?.name || 'item'} in the source branch — cannot fulfil without diverging branch and item stock.`,
          );
        }
        const bavail = Number(branchInventory.currentStock || 0);
        if (bavail < qty) throw new BadRequestException(`Insufficient stock in the source branch. Available: ${bavail}, requested: ${qty}`);
        branchInventory.currentStock = bavail - qty;
        await this.branchInventoryRepository.save(branchInventory);
        await stockMovementRepository.save(
          stockMovementRepository.create({
            itemId: item.inventoryItemId,
            branchId: srcBranch,
            movementType: StockMovementType.SALE,
            quantity: -qty,
            unitCost: alloc.costPrice != null ? Number(alloc.costPrice) : null,
            sourceType: 'order',
            sourceId: order.id,
            balanceAfter: inventoryItem ? Number(inventoryItem.currentStock) : 0,
          }),
        );
      }

      item.costPrice = alloc.costPrice;
      item.costTotal = alloc.costTotal;
      await this.orderItemRepository.save(item);
      totalCost += alloc.costTotal;
    }

    totalCost = Math.round(totalCost * 100) / 100;
    order.totalCost = totalCost;
    order.profit = Math.round((Number(order.subtotal) - totalCost) * 100) / 100;
    order.branchId = branchId; // reflect where the seller actually fulfilled from
    order.status = 'completed';
    if (actor) {
      order.updatedBy = actor.id || null;
      order.updatedByName = actor.name || null;
    }
    await this.orderRepository.save(order);

    if (Number(order.subtotal) > 0) {
      // Marketplace sale is on CREDIT — the buyer settles later (wallet/external),
      // so recognise revenue against Accounts Receivable, not Cash. (POS sales in
      // create() stay isCash:true — those are paid at the point of sale.) The AR
      // is cleared when the order is paid; see network-orders settlement.
      await this.postingService.postSale({
        sourceType: 'order',
        sourceId: order.id,
        revenue: Number(order.subtotal),
        cogs: totalCost,
        tax: Number(order.tax || 0),
        isCash: false,
        memo: `Marketplace order ${order.orderNumber}`,
      });
    }
    return this.findOne(orderId);
  }

  /**
   * Cancel a PENDING marketplace sale (seller declined the order). No-op if the
   * order is missing or already fulfilled/closed — no stock was moved for a
   * pending sale, so nothing to reverse.
   */
  async cancelIfPending(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (order && order.status === 'pending') {
      order.status = 'cancelled';
      await this.orderRepository.save(order);
    }
  }

  // Diagnostic method to help with testing
  async getDiagnosticInfo(branchId?: string) {
    const orderCount = await this.orderRepository.count();
    const junctionCount = await this.orderItemInflowItemRepository.count();
    const inflowItemCount = await this.inflowItemRepository.count();
    const branchInflowItemCount = branchId 
      ? await this.inflowItemRepository.count({ where: { branchId } })
      : 0;

    const recentInflowItems = await this.inflowItemRepository.find({
      take: 5,
      relations: ['inventoryItem', 'branch'],
      order: { createdAt: 'DESC' }
    });

    const recentOrders = await this.orderRepository.find({
      take: 5,
      relations: ['items'],
      order: { createdAt: 'DESC' }
    });

    return {
      summary: {
        totalOrders: orderCount,
        junctionRecords: junctionCount,
        totalInflowItems: inflowItemCount,
        branchInflowItems: branchInflowItemCount,
      },
      recentInflowItems: recentInflowItems.map(item => ({
        id: item.id,
        branchId: item.branchId,
        branchName: item.branch?.name,
        inventoryItemId: item.inventoryItemId,
        inventoryItemName: item.inventoryItem?.name,
        baseQuantity: item.baseQuantity,
        unitCost: item.unitCost,
        createdAt: item.createdAt
      })),
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        branchId: order.branchId,
        itemCount: order.items?.length || 0,
        status: order.status,
        createdAt: order.createdAt
      }))
    };
  }

  async findAll(branchIds?: string[] | null) {
    // Scoped to an empty branch set (user assigned to no branch) → no results.
    if (Array.isArray(branchIds) && branchIds.length === 0) return [];
    const where: any = {};
    if (branchIds && branchIds.length) {
      where.branchId = branchIds.length === 1 ? branchIds[0] : In(branchIds);
    }

    const orders = await this.orderRepository.find({
      where,
      relations: ["table", "branch", "items"],
      order: { createdAt: "DESC" },
    });

    // Manually load payments for all orders
    const orderIds = orders.map((o) => o.id);
    const paymentsMap = new Map<string, any[]>();
    if (orderIds.length > 0) {
      const payments = await this.orderPaymentRepository.find({
        where: { orderId: In(orderIds) },
        order: { createdAt: "ASC" },
      });

      payments.forEach((payment) => {
        if (!paymentsMap.has(payment.orderId)) {
          paymentsMap.set(payment.orderId, []);
        }
        paymentsMap.get(payment.orderId)!.push(payment);
      });
    }

    // Get item counts for all orders in one query
    const itemCountsMap = new Map<string, number>();
    const itemQuantityMap = new Map<string, number>();
    if (orderIds.length > 0) {
      const itemAggregates = await this.orderItemRepository
        .createQueryBuilder("item")
        .select("item.orderId", "orderId")
        .addSelect("COUNT(item.id)", "count")
        .addSelect("COALESCE(SUM(item.quantity), 0)", "totalQuantity")
        .where("item.orderId IN (:...orderIds)", { orderIds })
        .groupBy("item.orderId")
        .getRawMany();

      itemAggregates.forEach((row: any) => {
        itemCountsMap.set(row.orderId, parseInt(row.count, 10));
        itemQuantityMap.set(row.orderId, Number(row.totalQuantity || 0));
      });
    }

    // COGS per order: order items store no cost — the true cost of goods sold
    // lives in the FIFO inflow allocations (order_item_inflow_items.totalCost),
    // written when the sale is fulfilled. Aggregate it per order in one query.
    const costMap = new Map<string, number>();
    if (orderIds.length > 0) {
      const costRows = await this.orderItemRepository
        .createQueryBuilder("item")
        .innerJoin(
          "order_item_inflow_items",
          "alloc",
          "alloc.orderItemId = item.id",
        )
        .select("item.orderId", "orderId")
        .addSelect("COALESCE(SUM(alloc.totalCost), 0)", "cost")
        .where("item.orderId IN (:...orderIds)", { orderIds })
        .groupBy("item.orderId")
        .getRawMany();

      costRows.forEach((row: any) => {
        costMap.set(row.orderId, Number(row.cost || 0));
      });
    }

    // Attach the real COGS + profit (profit may be negative on a loss-making sale)
    return orders.map((order) => {
      const persisted = (order as any).totalCost;
      const totalCost =
        persisted !== undefined && persisted !== null && Number(persisted) > 0
          ? Number(persisted)
          : costMap.get(order.id) || 0;
      const profit = Number(order.subtotal || 0) - totalCost;
      return {
        ...order,
        payments: paymentsMap.get(order.id) || [],
        itemsCount: itemCountsMap.get(order.id) || 0,
        itemsSold: itemQuantityMap.get(order.id) || 0,
        totalCost,
        profit:
          order.profit !== undefined && order.profit !== null
            ? Number(order.profit)
            : profit,
      };
    });
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ["table", "branch", "payments"],
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Always manually load payments to ensure they're included (TypeORM relations can be unreliable)
    const payments = await this.orderPaymentRepository.find({
      where: { orderId: id },
      order: { createdAt: "ASC" },
    });
    (order as any).payments = payments || [];

    if (payments.length > 0) {
    }

    // Manually load items and their relations using QueryBuilder for better control
    const items = await this.orderItemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.uom", "uom")
      .leftJoinAndSelect("item.inventoryItem", "inventoryItem")
      .where("item.orderId = :orderId", { orderId: id })
      .getMany();

    // Manually load baseUoms for inventory items
    const baseUomIds = items
      .map((item) => (item as any).inventoryItem?.baseUomId)
      .filter(Boolean);
    const baseUomsMap = new Map<string, Uom>();
    if (baseUomIds.length > 0) {
      const uniqueBaseUomIds = [...new Set(baseUomIds)];
      const uomRepository = this.dataSource.getRepository(Uom);
      const baseUoms = await uomRepository.find({
        where: { id: In(uniqueBaseUomIds) },
      });
      baseUoms.forEach((uom) => {
        if (uom && uom.id) {
          baseUomsMap.set(uom.id, uom);
        }
      });
    }

    // Manually load inflowItems for all items
    const itemIds = items.map((item) => item.id);
    const inflowItemsMap = new Map<string, any[]>();
    const suppliersMap = new Map<string, Supplier>();
    const branchesMap = new Map<string, Branch>();

    if (itemIds.length > 0) {
      // Use leftJoinAndSelect to ensure records are returned even if relations fail
      let inflowItems = await this.orderItemInflowItemRepository
        .createQueryBuilder("itemInflowItem")
        .leftJoinAndSelect("itemInflowItem.inflowItem", "inflowItem")
        .leftJoinAndSelect("inflowItem.supplier", "supplier")
        .leftJoinAndSelect("inflowItem.branch", "branch")
        .leftJoinAndSelect("inflowItem.inflow", "inflow")
        .leftJoinAndSelect("inflow.supplier", "inflowSupplier")
        .leftJoinAndSelect("inflow.branch", "inflowBranch")
        .leftJoinAndSelect("inflowItem.uom", "uom")
        .where("itemInflowItem.orderItemId IN (:...itemIds)", { itemIds })
        .getMany();

      // Fallback: If relations didn't load (TypeORM sometimes fails with leftJoin), manually load them
      const itemsNeedingLoad = inflowItems.filter((item) => !item.inflowItem);
      if (itemsNeedingLoad.length > 0) {
        const inflowItemIds = itemsNeedingLoad.map((item) => item.inflowItemId);
        const loadedInflowItems = await this.inflowItemRepository.find({
          where: { id: In(inflowItemIds) },
          relations: [
            "supplier",
            "branch",
            "inflow",
            "inflow.supplier",
            "inflow.branch",
            "uom",
          ],
        });
        const loadedMap = new Map(
          loadedInflowItems.map((item) => [item.id, item]),
        );
        inflowItems.forEach((item) => {
          if (!item.inflowItem && loadedMap.has(item.inflowItemId)) {
            (item as any).inflowItem = loadedMap.get(item.inflowItemId);
          }
        });
      }

      // Group by orderItemId and collect supplier/branch IDs for manual loading
      const supplierIds = new Set<string>();
      const branchIds = new Set<string>();

      inflowItems.forEach((itemInflowItem, index) => {
        const orderItemId = itemInflowItem.orderItemId;

        if (!inflowItemsMap.has(orderItemId)) {
          inflowItemsMap.set(orderItemId, []);
        }
        inflowItemsMap.get(orderItemId)!.push(itemInflowItem);

        // Collect supplier and branch IDs for manual loading
        // Check item-level first, then fall back to inflow-level
        // Add null check for inflowItem
        if (!itemInflowItem.inflowItem) {
          return;
        }

        const itemSupplierId = (itemInflowItem.inflowItem as any).supplierId;
        const itemBranchId = (itemInflowItem.inflowItem as any).branchId;
        const inflowSupplierId = (itemInflowItem.inflowItem?.inflow as any)
          ?.supplierId;
        const inflowBranchId = (itemInflowItem.inflowItem?.inflow as any)
          ?.branchId;

        const effectiveSupplierId = itemSupplierId || inflowSupplierId;
        const effectiveBranchId = itemBranchId || inflowBranchId;

        if (effectiveSupplierId) {
          supplierIds.add(effectiveSupplierId);
        }

        if (effectiveBranchId) {
          branchIds.add(effectiveBranchId);
        }
      });

      // Manually load suppliers and branches if needed
      const supplierRepository = this.dataSource.getRepository(Supplier);
      const branchRepository = this.dataSource.getRepository(Branch);

      const [suppliers, branches] = await Promise.all([
        supplierIds.size > 0
          ? supplierRepository.find({
              where: {
                id:
                  supplierIds.size === 1
                    ? Array.from(supplierIds)[0]
                    : In(Array.from(supplierIds)),
              },
            })
          : [],
        branchIds.size > 0
          ? branchRepository.find({
              where: {
                id:
                  branchIds.size === 1
                    ? Array.from(branchIds)[0]
                    : In(Array.from(branchIds)),
              },
            })
          : [],
      ]);

      suppliers.forEach((s) => suppliersMap.set(s.id, s));
      branches.forEach((b) => branchesMap.set(b.id, b));

      // Update inflowItems with manually loaded suppliers and branches
      inflowItems.forEach((itemInflowItem) => {
        if (itemInflowItem.inflowItem) {
          // Use item-level supplier/branch if available, otherwise fall back to inflow-level
          // Access properties directly - TypeORM should have loaded them
          const itemSupplierId = (itemInflowItem.inflowItem as any).supplierId;
          const itemBranchId = (itemInflowItem.inflowItem as any).branchId;
          const inflowSupplierId = (itemInflowItem.inflowItem?.inflow as any)
            ?.supplierId;
          const inflowBranchId = (itemInflowItem.inflowItem?.inflow as any)
            ?.branchId;

          const effectiveSupplierId = itemSupplierId || inflowSupplierId;
          const effectiveBranchId = itemBranchId || inflowBranchId;

          // Always set supplier and branch from manually loaded maps if IDs exist
          if (effectiveSupplierId && suppliersMap.has(effectiveSupplierId)) {
            (itemInflowItem.inflowItem as any).supplier =
              suppliersMap.get(effectiveSupplierId);
          }

          if (effectiveBranchId && branchesMap.has(effectiveBranchId)) {
            (itemInflowItem.inflowItem as any).branch =
              branchesMap.get(effectiveBranchId);
          }
        }
      });
    }

    // Transform order items to include batches format for frontend compatibility
    order.items = items.map((orderItem: any) => {
      // Get inflowItems for this item
      const itemInflowItems = inflowItemsMap.get(orderItem.id) || [];

      // Calculate conversion factor from sale UOM to base UOM
      const qty = Number(orderItem.quantity || 0);
      const qtyBase = Number(orderItem.quantityBase || orderItem.quantity || 0);
      const multToBase = qty > 0 ? qtyBase / qty : 1.0;

      // Transform inflowItems to batches format expected by frontend
      const batches =
        itemInflowItems.map((itemInflowItem: any) => {
          const batchQtyBase = Number(itemInflowItem.quantityUsed || 0);
          const batchQtySale =
            multToBase > 0 ? batchQtyBase / multToBase : batchQtyBase;
          const batchSaleValue =
            batchQtySale * Number(orderItem.unitPrice || 0);
          const batchCostValue = Number(itemInflowItem.totalCost || 0);
          const batchProfit = batchSaleValue - batchCostValue;

          // Get supplier and branch IDs - use item-level first, then fall back to inflow-level
          // Add null check for inflowItem
          if (!itemInflowItem.inflowItem) {
            return {
              inflowItemId: itemInflowItem.inflowItemId,
              quantityUsed: itemInflowItem.quantityUsed,
              quantityUsedSaleUom: batchQtySale,
              costPerUnit: itemInflowItem.costPerUnit,
              costTotal: itemInflowItem.totalCost,
              saleValue: batchSaleValue,
              profit: batchProfit,
              supplier: null,
              branch: null,
              invoiceNumber: null,
              batchNumber: null,
              expiryDate: null,
              receivedAt: null,
              uom: null,
            };
          }

          const itemSupplierId = (itemInflowItem.inflowItem as any).supplierId;
          const itemBranchId = (itemInflowItem.inflowItem as any).branchId;
          const inflowSupplierId = (itemInflowItem.inflowItem?.inflow as any)
            ?.supplierId;
          const inflowBranchId = (itemInflowItem.inflowItem?.inflow as any)
            ?.branchId;

          const effectiveSupplierId = itemSupplierId || inflowSupplierId;
          const effectiveBranchId = itemBranchId || inflowBranchId;

          // Get supplier and branch from manually loaded maps (from the code above)
          const supplier =
            effectiveSupplierId && suppliersMap.has(effectiveSupplierId)
              ? {
                  id: suppliersMap.get(effectiveSupplierId)!.id,
                  name: suppliersMap.get(effectiveSupplierId)!.name,
                }
              : null;

          const branch =
            effectiveBranchId && branchesMap.has(effectiveBranchId)
              ? {
                  id: branchesMap.get(effectiveBranchId)!.id,
                  name: branchesMap.get(effectiveBranchId)!.name,
                }
              : null;

          // Get UOM - should be loaded via relation
          const uom = itemInflowItem.inflowItem?.uom
            ? {
                id: itemInflowItem.inflowItem.uom.id,
                name: itemInflowItem.inflowItem.uom.name,
                abbreviation: itemInflowItem.inflowItem.uom.abbreviation,
              }
            : null;

          return {
            inflowItemId: itemInflowItem.inflowItemId,
            quantityUsed: itemInflowItem.quantityUsed, // Base quantity
            quantityUsedSaleUom: batchQtySale, // Quantity in sale UOM
            costPerUnit: itemInflowItem.costPerUnit,
            costTotal: itemInflowItem.totalCost,
            saleValue: batchSaleValue,
            profit: batchProfit,
            supplier: supplier, // Explicitly preserve supplier as plain object
            branch: branch, // Explicitly preserve branch as plain object
            invoiceNumber:
              itemInflowItem.inflowItem?.inflow?.invoiceNumber || null,
            batchNumber: itemInflowItem.inflowItem?.batchNumber || null,
            expiryDate: itemInflowItem.inflowItem?.expiryDate || null,
            receivedAt: itemInflowItem.inflowItem?.inflow?.receivedAt || null,
            uom: uom, // UOM from inflow item (extracted as plain object)
          };
        }) || [];

      return {
        ...orderItem,
        batches: batches || [],
        baseUom: orderItem.inventoryItem?.baseUom || null,
      };
    });

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    await this.findOne(id);
    await this.orderRepository.update({ id }, updateOrderDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.orderRepository.delete({ id });
  }

  async markAsPaid(id: string, paymentDto: MarkPaidDto) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ["payments"],
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const totalAmount = Number(order.totalAmount || 0);
    const paymentMode = paymentDto.paymentMode || "full";

    // Calculate total paid amount from existing payments
    const existingPayments = order.payments || [];
    const totalPaid = existingPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );
    const remainingBalance = totalAmount - totalPaid;

    // Validate payment amount
    const paymentAmount = Number(paymentDto.amount || 0);
    if (paymentAmount <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero");
    }

    // Check for overpayment
    if (paymentMode === "full") {
      if (paymentAmount > remainingBalance) {
        throw new BadRequestException(
          `Payment amount (${paymentAmount}) exceeds remaining balance (${remainingBalance})`,
        );
      }
    } else {
      // Partial payment
      if (paymentAmount > remainingBalance) {
        throw new BadRequestException(
          `Payment amount (${paymentAmount}) exceeds remaining balance (${remainingBalance})`,
        );
      }
    }

    // Create payment record
    const payment = this.orderPaymentRepository.create({
      orderId: order.id,
      amount: paymentAmount,
      method: paymentDto.method,
      paymentMode: paymentMode,
      status: "completed",
      paidAt: new Date(),
      notes: paymentDto.notes || null,
    });

    const savedPayment = await this.orderPaymentRepository.save(payment);

    // Calculate new total paid
    const newTotalPaid = totalPaid + paymentAmount;

    // Update order status based on payment
    if (newTotalPaid >= totalAmount) {
      // Fully paid
      order.status = "completed";
    } else {
      // Partially paid
      order.status = "pending";
    }

    await this.orderRepository.save(order);

    // Manually load payments to ensure they're included
    const payments = await this.orderPaymentRepository.find({
      where: { orderId: id },
      order: { createdAt: "ASC" },
    });

    // Reload order with relations
    const reloadedOrder = await this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.table", "table")
      .leftJoinAndSelect("order.branch", "branch")
      .where("order.id = :id", { id })
      .getOne();

    if (!reloadedOrder) {
      throw new NotFoundException("Order not found after payment");
    }

    // Manually attach payments to the order object
    (reloadedOrder as any).payments = payments;

    if (payments.length > 0) {
      const totalPaymentsAmount = payments.reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0,
      );
    }

    return reloadedOrder;
  }
}
