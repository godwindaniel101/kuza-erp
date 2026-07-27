import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Transactional } from "typeorm-transactional";
import { v4 as uuidv4 } from "uuid";
import { InventoryInflow } from "../entities/inventory-inflow.entity";
import { InventoryInflowItem } from "../entities/inventory-inflow-item.entity";
import { InventoryItem } from "../entities/inventory-item.entity";
import { InventoryBatch } from "../entities/inventory-batch.entity";
import { BranchInventoryItem } from "../entities/branch-inventory-item.entity";
import { BulkUploadLog } from "../entities/bulk-upload-log.entity";
import { Business } from "../../../common/entities/business.entity";
import { Branch } from "../../../common/entities/branch.entity";
import { Supplier } from "../../rms/entities/supplier.entity";
import { CreateInventoryInflowDto } from "./dto/create-inventory-inflow.dto";
import { UpdateInventoryInflowDto } from "./dto/update-inventory-inflow.dto";
import { UomConversionsService } from "../uom-conversions/uom-conversions.service";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { StockMovementType } from "../entities/stock-movement.entity";
import { PostingService } from "../../accounting/posting.service";
import {
  BulkUploadResult,
  FailedUpload,
} from "../interfaces/bulk-upload.interface";

// Re-export for backwards compatibility
export type FailedInflowUpload = FailedUpload;
export { BulkUploadResult };
import { Uom } from "../entities/uom.entity";
import { OrderItemInflowItem } from "../../rms/entities/order-item-inflow-item.entity";

// Interface for parsed CSV row data
interface ParsedInflowRow {
  // Required fields
  branchName: string;
  branchId?: string;
  inventoryItemName: string;
  inventoryItemId?: string;
  inventoryItem?: InventoryItem;
  uomName: string;
  uomId?: string;
  uom?: Uom;
  quantity: number;
  costPerUnit: number;

  // Optional fields
  supplierName?: string;
  supplierId?: string;
  receivedAt?: string;
  invoiceNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  notes?: string;

  // Calculated fields
  baseQuantity?: number; // Quantity converted to base UOM
}

@Injectable()
export class InflowsService {
  constructor(
    @InjectRepository(InventoryInflow)
    private inflowRepository: Repository<InventoryInflow>,
    @InjectRepository(InventoryInflowItem)
    private inflowItemRepository: Repository<InventoryInflowItem>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryBatch)
    private batchRepository: Repository<InventoryBatch>,
    @InjectRepository(BranchInventoryItem)
    private branchInventoryRepository: Repository<BranchInventoryItem>,
    @InjectRepository(BulkUploadLog)
    private bulkUploadLogRepository: Repository<BulkUploadLog>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(Uom)
    private uomRepository: Repository<Uom>,
    @InjectRepository(OrderItemInflowItem)
    private orderItemInflowItemRepository: Repository<OrderItemInflowItem>,
    private uomConversionsService: UomConversionsService,
    private stockMovementsService: StockMovementsService,
    private postingService: PostingService,
  ) {}

  /**
   * Runs the whole inflow (header + items + stock + batches + ledger
   * movements) in one transaction (audit C-INV-2). Item and branch stock rows
   * are read with pessimistic write locks so concurrent inflows/orders cannot
   * interleave stock updates (audit C-INV-4).
   */
  @Transactional()
  async create(createDto: CreateInventoryInflowDto, performedById?: string) {
    let totalAmount = 0;

    // Get business currency - in multi-tenant setup, you might need to adjust this
    // For now, using a default currency or getting it from the first available business
    const business = await this.businessRepository.findOne({
      where: {}, // Gets any business in this tenant's database
    });
    const currency = business?.currency || "NGN";

    // Exclude `items` from the spread: the Inflow.items relation has
    // cascade:true, so spreading the DTO items here would cascade-insert
    // phantom inflow-item rows (with baseQuantity=0) in addition to the
    // explicit, fully-computed rows created below.
    const { items: _dtoItems, ...inflowData } = createDto;
    const inflow = this.inflowRepository.create({
      ...inflowData,
      currency,
      receivedDate: new Date(createDto.receivedDate),
      // Auto-generate a readable reference when none is supplied, mirroring the
      // order-number pattern (timestamp tail + short random suffix) instead of a
      // raw millisecond stamp.
      invoiceNumber:
        createDto.invoiceNumber?.trim() ||
        `INV-${Date.now().toString().slice(-8)}${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`,
    });

    const savedInflow = await this.inflowRepository.save(inflow);

    if (!savedInflow || !savedInflow.id) {
      throw new Error("Failed to save inflow: inflow ID is missing");
    }

    // Create inflow items and update stock
    if (createDto.items && createDto.items.length > 0) {
      // Process items SEQUENTIALLY (not Promise.all): when the same inventory
      // item appears more than once in a branch's inflow (e.g. two batches),
      // concurrent processing would both "find-or-create" the branch-inventory
      // row at the same time, insert a duplicate, and violate the
      // (branch_id, inventory_item_id) unique constraint — which aborts the
      // entire request transaction so nothing is created. Sequential processing
      // lets the second occurrence find and update the row the first created.
      for (const item of createDto.items) {
          // Validate that required fields are present
          if (!item.inventoryItemId || !item.uomId) {
            throw new Error(
              "Missing required fields: inventoryItemId and uomId are required",
            );
          }

          // Ensure values are properly converted to numbers (DTO validates these as numbers, but handle edge cases)
          const quantity = item.quantity != null ? Number(item.quantity) : 0;
          const unitCost = item.unitCost != null ? Number(item.unitCost) : 0;

          // Validate numeric values
          if (isNaN(quantity) || isNaN(unitCost)) {
            throw new Error("Quantity and unitCost must be valid numbers");
          }

          if (quantity <= 0 || unitCost <= 0) {
            throw new Error("Quantity and unitCost must be greater than 0");
          }

          // Calculate totalCost, ensuring it's never null, undefined, or NaN
          const calculatedTotalCost = quantity * unitCost;

          // Validate the calculation result
          if (
            isNaN(calculatedTotalCost) ||
            calculatedTotalCost == null ||
            calculatedTotalCost === undefined
          ) {
            throw new Error(
              `Failed to calculate totalCost for item ${item.inventoryItemId}: quantity=${quantity}, unitCost=${unitCost}`,
            );
          }

          // Round to 2 decimal places using proper rounding (avoid floating point issues)
          const totalCostValue = Math.round(calculatedTotalCost * 100) / 100;

          // Final validation - ensure it's a valid number
          if (
            isNaN(totalCostValue) ||
            totalCostValue == null ||
            totalCostValue === undefined
          ) {
            throw new Error(
              `Invalid totalCost value for item ${item.inventoryItemId}: calculated=${calculatedTotalCost}, rounded=${totalCostValue}`,
            );
          }

          totalAmount += totalCostValue;

          // Load inventory item if ID is provided, otherwise handle as null reference
          let inventoryItem = null;
          let baseQuantity = Number(quantity) || 0;

          if (item.inventoryItemId) {
            // Pessimistic lock: serialize concurrent stock updates on this
            // item (locked read must not join relations; only scalar columns
            // are used below anyway).
            inventoryItem = await this.inventoryItemRepository
              .createQueryBuilder("item")
              .setLock("pessimistic_write")
              .where("item.id = :id", { id: item.inventoryItemId })
              .getOne();

            if (!inventoryItem) {
              throw new Error(
                `Inventory item ${item.inventoryItemId} not found`,
              );
            }

            // Calculate base quantity: convert input quantity to base UOM
            if (item.uomId && item.uomId !== inventoryItem.baseUomId) {
              try {
                const converted = await this.uomConversionsService.convert(
                  item.uomId,
                  inventoryItem.baseUomId,
                  quantity,
                );
                baseQuantity = Number(converted) || Number(quantity) || 0;
              } catch (error) {
                throw new Error(
                  `Cannot convert ${quantity} from UOM ${item.uomId} to base UOM ${inventoryItem.baseUomId} for item ${inventoryItem.name}. Please ensure UOM conversion exists.`,
                );
              }
            }

            // Update stock using base quantity
            inventoryItem.currentStock =
              Number(inventoryItem.currentStock) + Number(baseQuantity);
            await this.inventoryItemRepository.save(inventoryItem);
          }

          // Ensure baseQuantity is a valid number
          if (
            isNaN(baseQuantity) ||
            baseQuantity == null ||
            baseQuantity === undefined
          ) {
            baseQuantity = Number(quantity) || 0;
          }

          // NOTE: item-level stock was already incremented once above (inside the
          // `if (item.inventoryItemId)` block). Do NOT increment again here — doing
          // so previously double-counted every inflow at the item level.

          // Use item-level branchId if provided, otherwise use inflow-level branchId (required, so always has a value)
          const itemBranchId = item.branchId || createDto.branchId;
          if (!itemBranchId) {
            throw new Error("Branch ID is required for inflow items");
          }

          // Update branch inventory for the item's branch (locked read so
          // concurrent writers cannot interleave the read-modify-write).
          let branchInventory = await this.branchInventoryRepository
            .createQueryBuilder("branchItem")
            .setLock("pessimistic_write")
            .where(
              "branchItem.branchId = :branchId AND branchItem.inventoryItemId = :itemId",
              { branchId: itemBranchId, itemId: item.inventoryItemId },
            )
            .getOne();

          if (!branchInventory) {
            branchInventory = this.branchInventoryRepository.create({
              branchId: itemBranchId,
              inventoryItemId: item.inventoryItemId,
              currentStock: 0,
              salePrice: inventoryItem.salePrice,
              minimumStock: inventoryItem.minimumStock,
              maximumStock: inventoryItem.maximumStock,
            });
          }

          // Use the same baseQuantity calculated above for branch inventory
          branchInventory.currentStock =
            Number(branchInventory.currentStock) + Number(baseQuantity);
          // Warehouse MS v1: record where this line was put away (guarded —
          // only overwrites when the caller supplied a bin location).
          if (item.binLocation) {
            branchInventory.binLocation = item.binLocation;
          }
          await this.branchInventoryRepository.save(branchInventory);

          // Create batch if trackable
          // Use item-level supplier if provided, otherwise use inflow-level supplier (can be null/undefined)
          const batchSupplierId =
            item.supplierId || createDto.supplierId || null;

          // Only create batch for trackable items that have valid inventory item reference
          let savedBatch: InventoryBatch | null = null;
          if (
            inventoryItem &&
            inventoryItem.isTrackable &&
            item.inventoryItemId
          ) {
            const batch = this.batchRepository.create({
              inventoryItemId: item.inventoryItemId,
              supplierId: batchSupplierId,
              inputUomId: item.uomId,
              quantity: item.quantity,
              remainingQuantity: item.quantity,
              costPerUnit: item.unitCost,
              inputQuantity: item.quantity,
              inputCostPerUnit: item.unitCost,
              receivedAt: new Date(createDto.receivedDate),
              batchNumber:
                item.batchNumber ||
                `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              notes: item.notes,
            });
            savedBatch = await this.batchRepository.save(batch);
          }

          // Immutable ledger entry (roadmap I1): one INFLOW movement per
          // stock-increasing line, in the same transaction as the stock
          // update above. Skipped when no inventory item is referenced
          // because no stock was changed in that case.
          if (inventoryItem && item.inventoryItemId) {
            await this.stockMovementsService.record({
              itemId: item.inventoryItemId,
              branchId: itemBranchId,
              batchId: savedBatch?.id ?? null,
              movementType: StockMovementType.INFLOW,
              quantity: Number(baseQuantity),
              unitCost: Number(unitCost),
              sourceType: "inflow",
              sourceId: savedInflow.id,
              performedById: performedById ?? null,
              balanceAfter: Number(inventoryItem.currentStock),
            });
          }

          // Create inflow item entity with both the foreign key ID and the relationship object
          // Setting both ensures TypeORM properly handles the relationship
          // baseQuantity is already calculated above - ensure it's a valid number
          const finalBaseQuantity = Number(baseQuantity);
          if (isNaN(finalBaseQuantity)) {
            throw new Error(
              `Invalid baseQuantity calculated: ${baseQuantity} for item ${item.inventoryItemId}`,
            );
          }

          // Ensure branchId is always set (required) - fall back to inflow-level if not provided
          const finalBranchId = itemBranchId || (savedInflow as any).branchId;
          if (!finalBranchId) {
            throw new Error("Branch ID is required for inflow items");
          }

          // Ensure supplierId is set - use item-level if provided, otherwise use inflow-level (can be null)
          const finalSupplierId =
            batchSupplierId || (savedInflow as any).supplierId || null;

          const inflowItem = this.inflowItemRepository.create({
            inflowId: savedInflow.id,
            inventoryItemId: item.inventoryItemId,
            uomId: item.uomId,
            quantity: Number(quantity), // Input quantity in selected UOM
            baseQuantity: finalBaseQuantity, // Equivalent quantity in base UOM - must be valid number
            unitCost: Number(unitCost),
            totalCost: Number(totalCostValue),
            batchNumber: item.batchNumber || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            supplierId: finalSupplierId, // Supplier per item (can override inflow-level supplier), fallback to inflow-level
            branchId: finalBranchId, // Always set - use item-level branchId if provided, otherwise use inflow-level branchId
            // Store original names for manual correction when relations are null
            originalItemName: item.originalItemName || null,
            originalUomName: item.originalUomName || null,
          });

          await this.inflowItemRepository.save(inflowItem);
        }
    }

    savedInflow.totalAmount = totalAmount;
    const finalInflow = await this.inflowRepository.save(savedInflow);

    // Double-entry posting for the goods receipt (audit A5): Dr Inventory /
    // Cr Accounts Payable, same transaction as the stock increase.
    // Idempotent per inflow id.
    if (totalAmount > 0) {
      await this.postingService.postGoodsReceipt({
        inflowId: finalInflow.id,
        amount: totalAmount,
        isCash: false,
        memo: `Goods receipt${finalInflow.invoiceNumber ? ` (invoice ${finalInflow.invoiceNumber})` : ""}`,
      });
    }

    // Reload to ensure all data including items are properly loaded with relations
    return this.findOne(finalInflow.id);
  }

  async findAll(branchIds?: string[] | null, batchId?: string) {
    const where: any = {};
    if (Array.isArray(branchIds) && branchIds.length === 0) {
      // Scoped to no branch (assigned to none) → match nothing.
      where.branchId = "00000000-0000-0000-0000-000000000000";
    } else if (branchIds && branchIds.length) {
      where.branchId = branchIds.length === 1 ? branchIds[0] : In(branchIds);
    }
    if (batchId) {
      where.batchId = batchId;
    }

    const inflows = await this.inflowRepository.find({
      where,
      relations: ["branch", "supplier"],
      order: { createdAt: "DESC" },
    });

    // Load line items via a direct query and group them by inflow. The
    // inflow.items OneToMany relation does not hydrate here (the joined table
    // resolves to the wrong schema), which left item counts showing 0.
    const inflowIds = inflows.map((i) => i.id);
    const allItems = inflowIds.length
      ? await this.inflowItemRepository.find({
          where: { inflowId: In(inflowIds) },
          relations: ["inventoryItem", "inventoryItem.baseUom", "uom"],
        })
      : [];
    const itemsByInflow = new Map<string, InventoryInflowItem[]>();
    for (const it of allItems) {
      const arr = itemsByInflow.get(it.inflowId) || [];
      arr.push(it);
      itemsByInflow.set(it.inflowId, arr);
    }

    // Calculate failedUploadsCount and fix missing data for each inflow
    const inflowsWithCounts = await Promise.all(
      inflows.map(async (inflow) => {
        let failedUploadsCount = 0;

        // Attach the directly-loaded line items.
        inflow.items = itemsByInflow.get(inflow.id) || [];

        // Load branch manually if relation failed
        if (inflow.branchId && !inflow.branch) {
          const branch = await this.branchRepository.findOne({
            where: { id: inflow.branchId },
          });
          if (branch) {
            inflow.branch = branch;
          }
        }

        // Load supplier manually if relation failed
        if (inflow.supplierId && !inflow.supplier) {
          const supplier = await this.supplierRepository.findOne({
            where: { id: inflow.supplierId },
          });
          if (supplier) {
            inflow.supplier = supplier;
          }
        }

        if (inflow.batchId) {
          // Count failed uploads specifically for this inflow ID
          failedUploadsCount = await this.bulkUploadLogRepository.count({
            where: {
              uploadType: "inflow",
              inflowId: inflow.id,
              uploadSessionId: inflow.batchId,
            },
          });

          // If no records found with inflowId, check for validation failures by branch name
          if (failedUploadsCount === 0 && inflow.branch?.name) {
            const qb = this.bulkUploadLogRepository.createQueryBuilder("log");
            failedUploadsCount = await qb
              .where("log.uploadType = :uploadType", {
                uploadType: "inflow",
              })
              .andWhere("log.uploadSessionId = :uploadSessionId", {
                uploadSessionId: inflow.batchId,
              })
              .andWhere("log.inflowId IS NULL")
              .andWhere(
                // Postgres JSON access (was MySQL JSON_EXTRACT, which does not
                // exist in Postgres and 500'd the inflows list endpoint).
                "log.rowData ->> 'branchName' = :branchName",
                { branchName: inflow.branch.name },
              )
              .getCount();
          }
        }

        // Recalculate totalAmount from items if it's 0 or null
        let totalAmount = Number(inflow.totalAmount) || 0;
        if (totalAmount === 0 && inflow.items && inflow.items.length > 0) {
          totalAmount = inflow.items.reduce((sum, item) => {
            const itemTotal = Number(item.totalCost) || 0;
            return sum + itemTotal;
          }, 0);

          // Update the database with the correct totalAmount
          if (totalAmount > 0) {
            await this.inflowRepository.update(inflow.id, { totalAmount });
          }
        }

        return {
          ...inflow,
          totalAmount,
          failedUploadsCount,
        };
      }),
    );

    return inflowsWithCounts;
  }

  /**
   * Summary of an entire purchase / bulk-upload session (one batchId can span
   * several branch inflows). Aggregates every line item across all inflows in
   * the batch plus per-branch and grand totals.
   */
  async getBatchSummary(batchId: string) {
    const inflows = await this.inflowRepository.find({
      where: { batchId },
      relations: ["branch", "supplier"],
      order: { createdAt: "ASC" },
    });

    if (!inflows.length) {
      throw new NotFoundException("Batch not found");
    }

    const inflowIds = inflows.map((i) => i.id);
    const allItems = await this.inflowItemRepository.find({
      where: { inflowId: In(inflowIds) },
      relations: ["inventoryItem", "inventoryItem.baseUom", "uom", "supplier"],
      order: { createdAt: "ASC" },
    });

    const inflowById = new Map(inflows.map((inf) => [inf.id, inf]));
    const branchAgg = new Map<
      string,
      { branchId: string; branchName: string; itemCount: number; totalAmount: number }
    >();
    const supplierNames = new Set<string>();
    let totalAmount = 0;

    const lineItems = allItems.map((it) => {
      const inf = inflowById.get(it.inflowId);
      const branchName = inf?.branch?.name || "—";
      const lineTotal = Number(it.totalCost) || 0;
      totalAmount += lineTotal;

      if (inf?.branchId) {
        const agg =
          branchAgg.get(inf.branchId) || {
            branchId: inf.branchId,
            branchName,
            itemCount: 0,
            totalAmount: 0,
          };
        agg.itemCount += 1;
        agg.totalAmount += lineTotal;
        branchAgg.set(inf.branchId, agg);
      }
      if (it.supplier?.name) supplierNames.add(it.supplier.name);
      else if (inf?.supplier?.name) supplierNames.add(inf.supplier.name);

      return {
        branchName,
        itemName: it.inventoryItem?.name || it.originalItemName || "—",
        uomName: it.uom?.name || it.originalUomName || "—",
        quantity: Number(it.quantity) || 0,
        baseQuantity: Number(it.baseQuantity) || 0,
        unitCost: Number(it.unitCost) || 0,
        totalCost: lineTotal,
        batchNumber: it.batchNumber || null,
        expiryDate: it.expiryDate || null,
        supplierName: it.supplier?.name || inf?.supplier?.name || null,
      };
    });

    const statuses = Array.from(new Set(inflows.map((i) => i.status)));
    const status =
      statuses.length === 1 ? statuses[0] : statuses.includes("pending") ? "partial" : statuses[0];

    return {
      batchId,
      receivedDate: inflows[0].receivedDate,
      createdAt: inflows[0].createdAt,
      currency: inflows[0].currency || "NGN",
      status,
      inflowCount: inflows.length,
      branchCount: branchAgg.size,
      totalItems: lineItems.length,
      totalAmount,
      suppliers: Array.from(supplierNames),
      branches: Array.from(branchAgg.values()),
      inflows: inflows.map((i) => ({
        id: i.id,
        branchName: i.branch?.name || "—",
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        totalAmount: Number(i.totalAmount) || 0,
      })),
      items: lineItems,
    };
  }

  async findOne(id: string) {
    const inflow = await this.inflowRepository
      .createQueryBuilder("inflow")
      .leftJoinAndSelect("inflow.branch", "branch")
      .leftJoinAndSelect("inflow.supplier", "supplier")
      .where("inflow.id = :id", { id })
      .getOne();

    if (!inflow) {
      throw new NotFoundException("Inventory inflow not found");
    }

    // Load line items via a direct query rather than the inflow.items
    // OneToMany relation: the relation join returns an empty collection here
    // (joined table resolves to the wrong schema), which left the items tab
    // blank and item counts at 0.
    inflow.items = await this.inflowItemRepository.find({
      where: { inflowId: id },
      relations: [
        "supplier",
        "branch",
        "inventoryItem",
        "inventoryItem.baseUom",
        "inventoryItem.category",
        "inventoryItem.subcategory",
        "uom",
      ],
    });

    // Manually load inflow-level supplier and branch if not loaded
    const inflowSupplierId = (inflow as any).supplierId;
    const inflowBranchId = (inflow as any).branchId;
    if (inflowSupplierId && !(inflow as any).supplier) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: inflowSupplierId },
      });
      if (supplier) {
        (inflow as any).supplier = supplier;
      }
    }
    if (inflowBranchId && !(inflow as any).branch) {
      const branch = await this.branchRepository.findOne({
        where: { id: inflowBranchId },
      });
      if (branch) {
        (inflow as any).branch = branch;
      }
    }

    // Ensure all relations are properly accessible
    // TypeORM aliases in leftJoinAndSelect don't change the property name
    // The relation property is still 'supplier' as defined in the entity
    // But if relations didn't load properly, manually load them
    if (
      inflow.items &&
      Array.isArray(inflow.items) &&
      inflow.items.length > 0
    ) {
      // Collect all IDs that might need manual loading
      const supplierIds = new Set<string>();
      const branchIds = new Set<string>();
      const inventoryItemIds = new Set<string>();
      const uomIds = new Set<string>();

      // Include inflow-level supplier and branch IDs
      if (inflowSupplierId) {
        supplierIds.add(inflowSupplierId);
      }
      if (inflowBranchId) {
        branchIds.add(inflowBranchId);
      }

      inflow.items.forEach((item: any) => {
        // Always try to load supplier if supplierId exists (even if relation is null, it might not have loaded)
        if (item.supplierId) {
          supplierIds.add(item.supplierId);
        }
        // Always try to load branch if branchId exists (even if relation is null, it might not have loaded)
        if (item.branchId) {
          branchIds.add(item.branchId);
        }
        // Check if inventoryItem relation didn't load or is missing name
        if (
          item.inventoryItemId &&
          (!item.inventoryItem || !item.inventoryItem.name)
        ) {
          inventoryItemIds.add(item.inventoryItemId);
        }
        // Check if UOM relation didn't load or is missing name
        if (item.uomId && (!item.uom || !item.uom.name)) {
          uomIds.add(item.uomId);
        }
      });

      // Manually load missing relations in batch
      const supplierIdsArray = Array.from(supplierIds);
      const branchIdsArray = Array.from(branchIds);
      const inventoryItemIdsArray = Array.from(inventoryItemIds);
      const uomIdsArray = Array.from(uomIds);

      const [suppliers, branches, inventoryItems, uoms] = await Promise.all([
        supplierIdsArray.length > 0
          ? this.supplierRepository.find({
              where: {
                id:
                  supplierIdsArray.length === 1
                    ? supplierIdsArray[0]
                    : In(supplierIdsArray),
              },
            })
          : [],
        branchIdsArray.length > 0
          ? this.branchRepository.find({
              where: {
                id:
                  branchIdsArray.length === 1
                    ? branchIdsArray[0]
                    : In(branchIdsArray),
              },
            })
          : [],
        inventoryItemIdsArray.length > 0
          ? this.inventoryItemRepository.find({
              where: {
                id:
                  inventoryItemIdsArray.length === 1
                    ? inventoryItemIdsArray[0]
                    : In(inventoryItemIdsArray),
              },
              relations: ["baseUom", "category", "subcategory"],
            })
          : [],
        uomIdsArray.length > 0
          ? this.uomRepository.find({
              where: {
                id: uomIdsArray.length === 1 ? uomIdsArray[0] : In(uomIdsArray),
              },
            })
          : [],
      ]);

      // Create maps for quick lookup
      const suppliersMap = new Map<string, Supplier>(
        suppliers.map((s) => [s.id, s] as [string, Supplier]),
      );
      const branchesMap = new Map<string, Branch>(
        branches.map((b) => [b.id, b] as [string, Branch]),
      );
      const inventoryItemsMap = new Map<string, InventoryItem>(
        inventoryItems.map((i) => [i.id, i] as [string, InventoryItem]),
      );
      const uomsMap = new Map<string, Uom>(
        uoms.map((u) => [u.id, u] as [string, Uom]),
      );

      // Map items with manually loaded relations
      inflow.items = inflow.items.map((item: any) => {
        // Set supplier: use item-level supplierId if exists, otherwise fall back to inflow-level supplierId
        const effectiveSupplierId =
          item.supplierId || (inflow as any).supplierId;
        if (effectiveSupplierId && suppliersMap.has(effectiveSupplierId)) {
          item.supplier = suppliersMap.get(effectiveSupplierId);
          // Ensure supplierId is set on the item
          item.supplierId = effectiveSupplierId;
        } else if ((inflow as any).supplier) {
          // Fallback to inflow-level supplier if item-level not available
          item.supplier = (inflow as any).supplier;
          // Ensure supplierId is set from inflow-level
          item.supplierId = (inflow as any).supplierId || null;
        }

        // Set branch: use item-level branchId if exists, otherwise fall back to inflow-level branchId
        const effectiveBranchId = item.branchId || (inflow as any).branchId;
        if (effectiveBranchId && branchesMap.has(effectiveBranchId)) {
          item.branch = branchesMap.get(effectiveBranchId);
          // Ensure branchId is set on the item
          item.branchId = effectiveBranchId;
        } else if ((inflow as any).branch) {
          // Fallback to inflow-level branch if item-level not available
          item.branch = (inflow as any).branch;
          // Ensure branchId is set from inflow-level (required, so should always have a value)
          item.branchId = (inflow as any).branchId || null;
        }

        // Ensure inventoryItem is loaded
        if (
          item.inventoryItemId &&
          (!item.inventoryItem || !item.inventoryItem.name) &&
          inventoryItemsMap.has(item.inventoryItemId)
        ) {
          item.inventoryItem = inventoryItemsMap.get(item.inventoryItemId);
        }
        // Ensure UOM is loaded
        if (
          item.uomId &&
          (!item.uom || !item.uom.name) &&
          uomsMap.has(item.uomId)
        ) {
          item.uom = uomsMap.get(item.uomId);
        }
        return item;
      });
    }

    // Load failed upload logs for this inflow if it was created via bulk upload
    const failedUploads = await this.bulkUploadLogRepository.find({
      where: { inflowId: id },
      order: { lineNumber: "ASC" },
    });

    return {
      ...inflow,
      failedUploads: failedUploads.length > 0 ? failedUploads : undefined,
    };
  }

  async findOneWithSalesData(id: string) {
    const inflow = await this.findOne(id);

    if (!inflow || !inflow.items) {
      return inflow;
    }

    // Get sales data for each inflow item using OrderItemInflowItem junction table
    const itemsWithSalesData = await Promise.all(
      inflow.items.map(async (item: any) => {
        try {
          // Query to get sales data for THIS SPECIFIC inflow item using the junction table
          const salesQuery = `
            SELECT 
              COALESCE(SUM(oii.quantity_used), 0) as totalSold,
              COALESCE(SUM(oii.total_cost), 0) as totalCost,
              COUNT(DISTINCT oi.order_id) as orderCount,
              COALESCE(SUM(oi.quantity * oi.unit_price), 0) as totalSalesAmount
            FROM order_item_inflow_items oii
            INNER JOIN order_items oi ON oii.order_item_id = oi.id
            INNER JOIN orders o ON oi.order_id = o.id
            WHERE oii.inflow_item_id = $1
              AND o.status != 'cancelled'
          `;

          const salesData = await this.orderItemInflowItemRepository.query(
            salesQuery,
            [item.id],
          );

          const sales =
            salesData && salesData.length > 0
              ? salesData[0]
              : {
                  totalsold: "0",
                  totalsalesamount: "0",
                  totalcost: "0",
                  ordercount: "0",
                };

          const totalSold = Number(sales.totalsold || 0);
          // Use baseQuantity, but fall back to quantity if baseQuantity is 0 (data integrity issue)
          const baseQuantity =
            Number(item.baseQuantity || 0) || Number(item.quantity || 0);
          const remainingQuantity = Math.max(0, baseQuantity - totalSold);

          return {
            ...item,
            supplierId: item.supplierId || item.supplier?.id || null, // Preserve supplierId
            branchId: item.branchId || item.branch?.id || null, // Preserve branchId
            inflowId: item.inflowId || null, // Preserve inflowId
            supplier: item.supplier, // Explicitly preserve supplier relation
            branch: item.branch, // Explicitly preserve branch relation
            inventoryItem: item.inventoryItem, // Explicitly preserve inventoryItem relation
            uom: item.uom, // Explicitly preserve uom relation
            salesData: {
              totalSold: totalSold,
              totalSalesAmount: Number(sales.totalsalesamount || 0),
              totalCost: Number(sales.totalcost || 0),
              orderCount: Number(sales.ordercount || 0),
              remainingQuantity: remainingQuantity,
            },
          };
        } catch {
          return {
            ...item,
            supplierId: item.supplierId || item.supplier?.id || null, // Preserve supplierId
            branchId: item.branchId || item.branch?.id || null, // Preserve branchId
            inflowId: item.inflowId || null, // Preserve inflowId
            supplier: item.supplier, // Explicitly preserve supplier relation
            branch: item.branch, // Explicitly preserve branch relation
            inventoryItem: item.inventoryItem, // Explicitly preserve inventoryItem relation
            uom: item.uom, // Explicitly preserve uom relation
            salesData: {
              totalSold: 0,
              totalSalesAmount: 0,
              totalCost: 0,
              orderCount: 0,
              remainingQuantity: Number(item.baseQuantity || 0),
            },
          };
        }
      }),
    );

    return {
      ...inflow,
      items: itemsWithSalesData,
    };
  }

  async update(id: string, updateDto: UpdateInventoryInflowDto) {
    await this.findOne(id);
    await this.inflowRepository.update({ id }, updateDto);
    return this.findOne(id);
  }

  @Transactional()
  async approve(id: string, approvedBy: string) {
    const inflow = await this.findOne(id);
    inflow.status = "approved";
    inflow.approvedBy = approvedBy;
    inflow.approvedAt = new Date();
    return this.inflowRepository.save(inflow);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.inflowRepository.delete({ id });
  }

  async generateTemplate(): Promise<string> {
    // User-friendly template with names instead of IDs
    // Format: Branch Name | Supplier Name | Received At (optional, YYYY-MM-DD) | Inventory Item Name | UOM/Unit | Quantity | Cost Per Unit | Batch Number (optional) | Expiry Date (optional, YYYY-MM-DD) | Invoice Number (optional) | Notes (optional)
    const headers = [
      "Branch Name",
      "Supplier Name",
      "Received At (optional, YYYY-MM-DD)",
      "Inventory Item Name",
      "UOM", // Accept both "UOM" and "Unit" for consistency with inventory upload
      "Quantity",
      "Cost Per Unit",
      "Batch Number (optional)",
      "Expiry Date (optional, YYYY-MM-DD)",
      "Invoice Number (optional)",
      "Notes (optional)",
    ];
    // Use tab separator for better Excel compatibility, but support tabs, pipes, and commas in parsing
    return headers.join("\t") + "\n";
  }

  async bulkUpload(csv: string): Promise<BulkUploadResult> {
    const errors: string[] = [];
    const failedUploads: FailedInflowUpload[] = [];
    let duplicateSkipped = 0;

    // Generate a proper UUID for batch ID (required by entity)
    const batchId = uuidv4();
    const uploadSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const lines = csv.trim().split(/\r?\n/);

    // Spreadsheet tools (notably Excel) can prepend a delimiter-hint line
    // ("sep=,") and/or blank/title lines before the real header. Skip that
    // noise so the header row is detected correctly — otherwise "sep=," is read
    // as the header and every required column reads as missing. When the hint
    // declares a delimiter, honour it (covers comma AND semicolon exports).
    let sepHint = "";
    const isPreHeaderNoise = (line: string): boolean => {
      const t = line.trim().replace(/^"|"$/g, "").trim();
      const m = t.match(/^sep=(.?)$/i);
      if (m) {
        sepHint = m[1];
        return true;
      }
      return t === "";
    };
    while (lines.length > 0 && isPreHeaderNoise(lines[0])) {
      lines.shift();
    }

    if (lines.length < 2) {
      return {
        success: 0,
        errors: ["CSV file is empty"],
        failedUploads: [],
        duplicateSkipped: 0,
        summary: {
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        },
      };
    }

    // Parse header
    const header = lines[0];
    // Detect the delimiter. Prefer an explicit "sep=" hint from the export; the
    // template is TAB-delimited, but exports/edits commonly produce comma (or
    // semicolon in some locales) — support tab/pipe/comma otherwise.
    const delimiter =
      sepHint || (header.includes("\t") ? "\t" : header.includes("|") ? "|" : ",");

    // Quote-aware line splitter: a field wrapped in double quotes may itself
    // contain the delimiter (e.g. the header hint "Received At (optional,
    // YYYY-MM-DD)" in a comma-delimited file, or a supplier/notes value with a
    // comma). A doubled quote ("") inside a quoted field is a literal quote.
    // Splitting naively on the delimiter mis-aligned columns and made Cost Per
    // Unit read the wrong (non-numeric) column.
    const splitLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === delimiter && !inQuotes) {
          out.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map((v) => v.trim());
    };

    const headers = splitLine(header).map((h) => h.toLowerCase());

    // Normalize function
    const normalize = (value: string) =>
      value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    const normalizedHeaders = headers.map(normalize);

    // Required headers - now accepting both "UOM" and "Unit" for consistency with inventory upload
    const requiredHeaders = [
      "branch name",
      "inventory item name",
      "quantity",
      "cost per unit",
    ].map(normalize);

    // UOM/Unit header - accept either one
    const hasUomHeader = normalizedHeaders.includes(normalize("uom"));
    const hasUnitHeader = normalizedHeaders.includes(normalize("unit"));

    if (!hasUomHeader && !hasUnitHeader) {
      requiredHeaders.push(normalize("uom")); // Add to missing headers list for error message
    }

    // Find missing headers
    const missingHeaders = requiredHeaders.filter(
      (req) => !normalizedHeaders.includes(req),
    );

    if (missingHeaders.length > 0) {
      return {
        success: 0,
        errors: [
          `Missing required headers: ${missingHeaders.join(", ")}. Note: Either 'UOM' or 'Unit' is required.`,
        ],
        failedUploads: [],
        duplicateSkipped: 0,
        summary: {
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        },
      };
    }

    // Parse data lines
    const parsedRows: ParsedInflowRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      const values = splitLine(line);

      // Skip empty lines
      if (values.every((v) => !v)) continue;

      // Create row data object
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || "";
      });

      const rowErrors: string[] = [];

      try {
        // Extract and validate required fields
        const branchName = rowData["branch name"] || rowData["branchname"];
        const inventoryItemName =
          rowData["inventory item name"] ||
          rowData["inventoryitemname"] ||
          rowData["item name"];
        const uomName = rowData["uom"] || rowData["unit"];
        const quantityStr = rowData["quantity"] || rowData["qty"];
        const costPerUnitStr =
          rowData["cost per unit"] ||
          rowData["costperunit"] ||
          rowData["cost"] ||
          rowData["price"];

        // Validate required fields
        if (!branchName) rowErrors.push("Branch Name is required");
        if (!inventoryItemName)
          rowErrors.push("Inventory Item Name is required");
        if (!uomName) rowErrors.push("UOM is required");
        if (!quantityStr) rowErrors.push("Quantity is required");
        if (!costPerUnitStr) rowErrors.push("Cost Per Unit is required");

        // Validate and parse numeric fields
        const quantity = parseFloat(quantityStr);
        const costPerUnit = parseFloat(costPerUnitStr);

        if (isNaN(quantity) || quantity <= 0) {
          rowErrors.push("Quantity must be a positive number");
        }
        if (isNaN(costPerUnit) || costPerUnit < 0) {
          rowErrors.push("Cost Per Unit must be a non-negative number");
        }

        // If basic validation fails, skip to next row
        if (rowErrors.length > 0) {
          failedUploads.push({
            lineNumber,
            rowData,
            errors: rowErrors,
            status: "failed",
          });

          continue;
        }

        // Create parsed row object
        const parsedRow: ParsedInflowRow = {
          branchName,
          inventoryItemName,
          uomName,
          quantity,
          costPerUnit,
          supplierName: rowData["supplier name"] || rowData["suppliername"],
          receivedAt:
            rowData["received at"] ||
            rowData["receivedat"] ||
            rowData["received date"] ||
            rowData["receiveddate"],
          invoiceNumber:
            rowData["invoice number"] ||
            rowData["invoicenumber"] ||
            rowData["invoice"],
          batchNumber:
            rowData["batch number"] ||
            rowData["batchnumber"] ||
            rowData["batch"],
          expiryDate:
            rowData["expiry date"] ||
            rowData["expirydate"] ||
            rowData["expiry"],
          notes: rowData["notes"] || rowData["note"] || rowData["comment"],
        };

        parsedRows.push(parsedRow);
      } catch (error: any) {
        rowErrors.push(`Parsing error: ${error.message}`);
        failedUploads.push({
          lineNumber,
          rowData,
          errors: rowErrors,
          status: "failed",
        });
      }
    }

    if (parsedRows.length === 0) {
      return {
        success: 0,
        errors: errors.length > 0 ? errors : ["No valid rows found in CSV"],
        failedUploads,
        duplicateSkipped,
        summary: {
          total: lines.length - 1,
          processed: 0,
          successful: 0,
          failed: failedUploads.length,
          skipped: 0,
        },
      };
    }

    // Lookup and validate entities in bulk
    await this.validateAndLookupEntities(parsedRows, failedUploads, lines);

    // Filter out rows that failed validation
    const validRows = parsedRows.filter((_, index) => {
      const lineNumber = index + 2; // +2 because index starts at 0 and we skip header
      return !failedUploads.some((failed) => failed.lineNumber === lineNumber);
    });

    if (validRows.length === 0) {
      return {
        success: 0,
        errors: ["No valid rows after entity validation"],
        failedUploads,
        duplicateSkipped,
        summary: {
          total: lines.length - 1,
          processed: parsedRows.length,
          successful: 0,
          failed: failedUploads.length,
          skipped: lines.length - 1 - parsedRows.length - failedUploads.length,
        },
      };
    }

    // Process UOM conversions and detect duplicates
    const processedRows = await this.processUomConversionsAndDuplicates(
      validRows,
      failedUploads,
      uploadSessionId,
      lines,
    );

    // Count duplicates that were skipped
    duplicateSkipped = failedUploads.filter(
      (f) => f.status === "skipped",
    ).length;

    // Filter final valid rows
    const finalValidRows = processedRows.filter(
      (row) => row.baseQuantity !== undefined && row.baseQuantity !== null,
    );

    if (finalValidRows.length === 0) {
      return {
        success: 0,
        errors: ["No valid rows after UOM conversion and duplicate detection"],
        failedUploads,
        duplicateSkipped,
        summary: {
          total: lines.length - 1,
          processed: processedRows.length,
          successful: 0,
          failed: failedUploads.length,
          skipped:
            lines.length - 1 - processedRows.length - failedUploads.length,
        },
      };
    }

    // Create inflows by branch
    const successCount = await this.createInflowsByBranch(
      finalValidRows,
      uploadSessionId,
      batchId,
      failedUploads,
    );

    const totalRows = lines.length - 1; // Exclude header
    const totalProcessedRows = totalRows;
    const skippedRows =
      totalProcessedRows - finalValidRows.length - failedUploads.length;

    return {
      success: successCount,
      errors,
      failedUploads,
      duplicateSkipped,
      summary: {
        total: totalRows,
        processed: totalProcessedRows,
        successful: successCount,
        failed: failedUploads.length,
        skipped: skippedRows,
      },
    };
  }

  // Helper method to validate and lookup entities in bulk
  private async validateAndLookupEntities(
    parsedRows: ParsedInflowRow[],
    failedUploads: FailedInflowUpload[],
    originalLines: string[],
  ): Promise<void> {
    const normalizeString = (str: string): string => {
      return str.toLowerCase().trim();
    };

    const uniqueBranchNames = [...new Set(parsedRows.map((r) => r.branchName))];
    const uniqueItemNames = [
      ...new Set(parsedRows.map((r) => r.inventoryItemName)),
    ];

    const uniqueUomNames = [...new Set(parsedRows.map((r) => r.uomName))];
    const uniqueSupplierNames = [
      ...new Set(
        parsedRows.map((r) => r.supplierName).filter(Boolean) as string[],
      ),
    ];

    // The lookup queries compare `LOWER(name) IN (:names)`, so the parameters
    // must be lowercased — NOT normalizeString'd (which strips spaces/punctuation
    // and would never match multi-word names like "Guinness Stout"). The
    // normalizeString-based maps below still provide fuzzy matching on the
    // returned rows.
    const lower = (n: string) => (n || "").trim().toLowerCase();
    const _uniqueBranchNames = uniqueBranchNames.map(lower);
    const _uniqueItemNames = uniqueItemNames.map(lower);
    const _uniqueUomNames = uniqueUomNames.map(lower);
    const _uniqueSupplierNames = uniqueSupplierNames.map(lower);

    // NOTE: an empty array passed to `IN (:...names)` makes TypeORM emit
    // `IN ()`, which is a Postgres syntax error. Guard each lookup so an empty
    // column (e.g. no suppliers in the CSV) doesn't crash the whole upload.
    const [allBranches, allInventoryItems, allUoms, allSuppliers] =
      await Promise.all([
        _uniqueBranchNames.length
          ? this.branchRepository
              .createQueryBuilder("branch")
              .where("LOWER(branch.name) IN (:...names)", {
                names: _uniqueBranchNames,
              })
              .getMany()
          : Promise.resolve([]),

        _uniqueItemNames.length
          ? this.inventoryItemRepository
              .createQueryBuilder("item")
              .leftJoinAndSelect("item.baseUom", "baseUom")
              .where("LOWER(item.name) IN (:...names)", {
                names: _uniqueItemNames,
              })
              .getMany()
          : Promise.resolve([]),

        _uniqueUomNames.length
          ? this.uomRepository
              .createQueryBuilder("uom")
              .where("LOWER(uom.name) IN (:...names)", { names: _uniqueUomNames })
              .getMany()
          : Promise.resolve([]),

        _uniqueSupplierNames.length
          ? this.supplierRepository
              .createQueryBuilder("supplier")
              .where("LOWER(supplier.name) IN (:...names)", {
                names: _uniqueSupplierNames,
              })
              .getMany()
          : Promise.resolve([]),
      ]);

    // Create lookup maps with proper typing - normalize names for better matching
    const branchMap = new Map<string, Branch>();
    allBranches.forEach((b) => branchMap.set(normalizeString(b.name), b));

    const itemMap = new Map<string, InventoryItem>();
    allInventoryItems.forEach((i) => itemMap.set(normalizeString(i.name), i));

    const uomMap = new Map<string, Uom>();
    allUoms.forEach((u) => uomMap.set(normalizeString(u.name), u));

    const supplierMap = new Map<string, Supplier>();
    allSuppliers.forEach((s) => supplierMap.set(normalizeString(s.name), s));

    // Validate and enrich each row
    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const lineNumber = i + 2; // Account for header and 0-based index
      const rowErrors: string[] = [];

      // Validate and set branch
      const branch = branchMap.get(normalizeString(row.branchName));
      if (!branch) {
        rowErrors.push(`Branch '${row.branchName}' not found`);
      } else {
        row.branchId = branch.id;
      }

      // Handle inventory item - allow creation with null if not found (soft validation)
      const inventoryItem = itemMap.get(normalizeString(row.inventoryItemName));
      if (inventoryItem) {
        row.inventoryItemId = inventoryItem.id;
        row.inventoryItem = inventoryItem;
      } else {
        // Store the item name for manual correction later, don't treat as hard error
        row.inventoryItemId = null;
        row.inventoryItem = null;
      }

      // Handle UOM - allow creation with null if not found (soft validation)
      const uom = uomMap.get(normalizeString(row.uomName));
      if (uom) {
        row.uomId = uom.id;
        row.uom = uom;
      } else {
        // Store the UOM name for manual correction later, don't treat as hard error
        row.uomId = null;
        row.uom = null;
      }

      if (row.supplierName) {
        let supplier = supplierMap.get(normalizeString(row.supplierName));
        if (!supplier) {
          // Auto-create supplier if it doesn't exist
          try {
            const newSupplier = this.supplierRepository.create({
              name: row.supplierName,
              contactPerson: "",
              phone: "",
              email: "",
              address: "",
            });
            supplier = await this.supplierRepository.save(newSupplier);
            supplierMap.set(normalizeString(row.supplierName), supplier);
          } catch (error: any) {
            rowErrors.push(
              `Failed to create supplier '${row.supplierName}': ${error.message}`,
            );
          }
        }
        if (supplier) {
          row.supplierId = supplier.id;
        }
      }

      if (rowErrors.length > 0) {
        failedUploads.push({
          lineNumber,
          rowData: {
            "branch name": row.branchName,
            "inventory item name": row.inventoryItemName,
            uom: row.uomName,
            quantity: row.quantity.toString(),
            "cost per unit": row.costPerUnit.toString(),
            "supplier name": row.supplierName || "",
            "received at": row.receivedAt || "",
            "invoice number": row.invoiceNumber || "",
            "batch number": row.batchNumber || "",
            "expiry date": row.expiryDate || "",
            notes: row.notes || "",
          },
          errors: rowErrors,
          status: "failed",
        });
      }
    }
  }

  // CORRECT FIX: Better duplicate detection that allows multiple batches
  // This replaces the processUomConversionsAndDuplicates method in your inflows.service.ts

  private async processUomConversionsAndDuplicates(
    validRows: ParsedInflowRow[],
    failedUploads: FailedInflowUpload[],
    uploadSessionId: string,
    originalLines: string[],
  ): Promise<ParsedInflowRow[]> {
    const processedRows: ParsedInflowRow[] = [];

    // Use Map to track exact duplicates (same branch, item, batch, date, supplier, quantity)
    // This allows multiple different batches of the same item
    const seenExactEntries = new Map<string, number>();

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const lineNumber = i + 2; // Account for header
      const rowErrors: string[] = [];

      try {
        // Only flag as duplicate if EVERYTHING matches (exact duplicate row)
        // This key is VERY specific - only blocks truly identical entries
        const exactDuplicateKey = `${row.branchId}|${row.inventoryItemId}|${row.supplierId || "none"}|${row.batchNumber || "none"}|${row.receivedAt || "none"}|${row.quantity}|${row.costPerUnit}`;

        if (seenExactEntries.has(exactDuplicateKey)) {
          const previousLine = seenExactEntries.get(exactDuplicateKey);

          failedUploads.push({
            lineNumber,
            rowData: {
              "branch name": row.branchName,
              "inventory item name": row.inventoryItemName,
              "supplier name": row.supplierName || "",
              "batch number": row.batchNumber || "",
              quantity: row.quantity.toString(),
              "cost per unit": row.costPerUnit.toString(),
            },
            errors: [
              `Exact duplicate row found (first seen at line ${previousLine}). This row has identical values for all fields.`,
            ],
            status: "skipped",
          });
          continue;
        }

        seenExactEntries.set(exactDuplicateKey, lineNumber);

        // Convert UOM to base UOM if necessary
        if (!row.inventoryItem || !row.uom) {
          rowErrors.push("Missing inventory item or UOM data");
        } else {
          if (row.uomId === row.inventoryItem.baseUomId) {
            // UOM matches base UOM, no conversion needed
            row.baseQuantity = row.quantity;
          } else {
            // Convert to base UOM using the UOM conversion service
            try {
              const baseQuantity = await this.uomConversionsService.convert(
                row.uomId!, // From UOM (specified in CSV)
                row.inventoryItem.baseUomId, // To UOM (base UOM)
                row.quantity,
              );
              row.baseQuantity = baseQuantity;
            } catch {
              // If UOM conversion fails, fall back to using original quantity as base quantity
              row.baseQuantity = row.quantity;
            }
          }
        }

        // If there are validation errors, add to failed uploads
        if (rowErrors.length > 0) {
          failedUploads.push({
            lineNumber,
            rowData: {
              "branch name": row.branchName,
              "inventory item name": row.inventoryItemName,
              uom: row.uomName,
              quantity: row.quantity.toString(),
              "cost per unit": row.costPerUnit.toString(),
            },
            errors: rowErrors,
            status: "failed",
          });
        } else {
          // Row is valid, add to processed rows
          processedRows.push(row);
        }
      } catch (error: any) {
        failedUploads.push({
          lineNumber,
          rowData: {
            "branch name": row.branchName,
            "inventory item name": row.inventoryItemName,
            uom: row.uomName,
            quantity: row.quantity.toString(),
            "cost per unit": row.costPerUnit.toString(),
          },
          errors: [`Unexpected processing error: ${error.message}`],
          status: "failed",
        });
      }
    }

    return processedRows;
  }

  // CORRECT FIX: Create one inflow per branch with ALL items from CSV
  // This replaces the createInflowsByBranch method in your inflows.service.ts

  private async createInflowsByBranch(
    validRows: ParsedInflowRow[],
    uploadSessionId: string,
    batchId: string,
    failedUploads: FailedInflowUpload[],
  ): Promise<number> {
    // Group rows by branch - ONE INFLOW PER BRANCH
    const rowsByBranch = new Map<string, ParsedInflowRow[]>();

    for (const row of validRows) {
      const branchId = row.branchId!;
      if (!rowsByBranch.has(branchId)) {
        rowsByBranch.set(branchId, []);
      }
      rowsByBranch.get(branchId)!.push(row);
    }

    let successCount = 0;

    // Create one inflow for each branch with ALL items
    for (const [branchId, branchRows] of rowsByBranch.entries()) {
      try {
        const firstRow = branchRows[0];

        // Generate common values for this branch's inflow
        const commonReceivedAt =
          firstRow.receivedAt || new Date().toISOString().split("T")[0];
        const branchName = firstRow.branchName;
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 6);
        const commonInvoiceNumber = `BULK-${branchName.toUpperCase().replace(/\s+/g, "")}-${timestamp}-${randomSuffix}`;

        // Determine common supplier if all rows have the same supplier
        const supplierIds = branchRows
          .map((r) => r.supplierId)
          .filter(Boolean) as string[];
        let commonSupplierId: string | undefined;
        if (supplierIds.length > 0) {
          const uniqueSuppliers = new Set(supplierIds);
          if (uniqueSuppliers.size === 1) {
            commonSupplierId = supplierIds[0];
          }
        }

        // Build items array - INCLUDE ALL ITEMS FOR THIS BRANCH with original names for null references
        const items = branchRows.map((row) => {
          return {
            inventoryItemId: row.inventoryItemId || null, // Allow null for missing items
            uomId: row.uomId || null, // Allow null for missing UOMs
            quantity: row.quantity, // Original quantity in specified UOM
            unitCost: row.costPerUnit,
            batchNumber:
              row.batchNumber ||
              `BATCH-${timestamp}-${Math.random().toString(36).substr(2, 6)}`,
            expiryDate: row.expiryDate,
            notes: row.notes,
            supplierId: row.supplierId || undefined,
            // Store original names for manual correction when relations are null
            originalItemName: row.inventoryItemId
              ? null
              : row.inventoryItemName,
            originalUomName: row.uomId ? null : row.uomName,
          };
        });

        // Create inflow for this branch with ALL items
        const createDto: CreateInventoryInflowDto = {
          branchId: branchId,
          supplierId: commonSupplierId,
          receivedDate: commonReceivedAt,
          invoiceNumber: commonInvoiceNumber,
          notes: `Bulk upload for ${branchName} - ${items.length} items`,
          items: items,
        };

        // Create the inflow - this will create all items
        const savedInflow = await this.create(createDto);

        // Update the saved inflow with the batch ID (UUID)
        savedInflow.batchId = batchId;
        savedInflow.type = "bulk";
        await this.inflowRepository.save(savedInflow);

        // Count the line items imported, not the number of branch inflows, so the
        // "Imported" total reflects the rows the user actually uploaded.
        successCount += savedInflow.items?.length || branchRows.length;
      } catch (error: any) {
        const errorBranchName = branchRows[0].branchName;

        // Log the error for this branch
        const errorLogEntry = this.bulkUploadLogRepository.create({
          uploadType: "inflow",
          lineNumber: 0, // Branch-level error
          rowData: {
            branchName: errorBranchName,
            itemCount: branchRows.length,
            error: "Failed to create inflow for entire branch",
          },
          errorMessages: [
            `Failed to create inflow for branch ${errorBranchName}: ${error.message || "Unknown error"}`,
            `Stack: ${error.stack || "No stack trace"}`,
          ],
          status: "failed",
          uploadSessionId,
        });
        await this.bulkUploadLogRepository.save(errorLogEntry);
      }
    }

    // Log validation failures separately (items that failed before reaching here)
    if (failedUploads.length > 0) {
      const logEntries = failedUploads.map((failed) =>
        this.bulkUploadLogRepository.create({
          uploadType: "inflow",
          inflowId: null,
          lineNumber: failed.lineNumber,
          rowData: failed.rowData,
          errorMessages: failed.errors,
          status: failed.status,
          uploadSessionId,
        }),
      );

      // Save in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < logEntries.length; i += batchSize) {
        const batch = logEntries.slice(i, i + batchSize);
        await this.bulkUploadLogRepository.save(batch);
      }
    }

    return successCount;
  }
}
