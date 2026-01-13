import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { InventoryInflow } from "../entities/inventory-inflow.entity";
import { InventoryInflowItem } from "../entities/inventory-inflow-item.entity";
import { InventoryItem } from "../entities/inventory-item.entity";
import { InventoryBatch } from "../entities/inventory-batch.entity";
import { BranchInventoryItem } from "../entities/branch-inventory-item.entity";
import { BulkUploadLog } from "../entities/bulk-upload-log.entity";
import { Restaurant } from "../../../common/entities/restaurant.entity";
import { Branch } from "../../../common/entities/branch.entity";
import { Supplier } from "../../rms/entities/supplier.entity";
import { CreateInventoryInflowDto } from "./dto/create-inventory-inflow.dto";
import { UpdateInventoryInflowDto } from "./dto/update-inventory-inflow.dto";
import { UomConversionsService } from "../uom-conversions/uom-conversions.service";

// Interface for bulk upload results with detailed tracking
export interface BulkUploadResult {
  success: number;
  errors: string[];
  failedUploads: FailedInflowUpload[];
  duplicateSkipped: number;
}
import { Uom } from "../entities/uom.entity";
import { OrderItemInflowItem } from "../../rms/entities/order-item-inflow-item.entity";

// Interface for tracking failed upload rows
export interface FailedInflowUpload {
  lineNumber: number;
  rowData: Record<string, string>;
  errors: string[];
  status: "failed" | "skipped";
}

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
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(Uom)
    private uomRepository: Repository<Uom>,
    @InjectRepository(OrderItemInflowItem)
    private orderItemInflowItemRepository: Repository<OrderItemInflowItem>,
    private uomConversionsService: UomConversionsService
  ) {}

  async create(businessId: string, createDto: CreateInventoryInflowDto) {
    let totalAmount = 0;

    // Get restaurant currency
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: businessId },
    });
    const currency = restaurant?.currency || "NGN";

    const inflow = this.inflowRepository.create({
      ...createDto,
      businessId,
      currency,
      receivedDate: new Date(createDto.receivedDate),
      invoiceNumber: createDto.invoiceNumber || `INV-${Date.now()}`,
    });

    const savedInflow = await this.inflowRepository.save(inflow);

    if (!savedInflow || !savedInflow.id) {
      throw new Error("Failed to save inflow: inflow ID is missing");
    }

    // Create inflow items and update stock
    if (createDto.items && createDto.items.length > 0) {
      const items = await Promise.all(
        createDto.items.map(async (item) => {
          // Validate that required fields are present
          if (!item.inventoryItemId || !item.uomId) {
            throw new Error(
              "Missing required fields: inventoryItemId and uomId are required"
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
              `Failed to calculate totalCost for item ${item.inventoryItemId}: quantity=${quantity}, unitCost=${unitCost}`
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
              `Invalid totalCost value for item ${item.inventoryItemId}: calculated=${calculatedTotalCost}, rounded=${totalCostValue}`
            );
          }

          totalAmount += totalCostValue;

          // Load inventory item first to get baseUomId
          const inventoryItem = await this.inventoryItemRepository.findOne({
            where: { id: item.inventoryItemId },
            relations: ["baseUom"],
          });

          if (!inventoryItem) {
            throw new Error(`Inventory item ${item.inventoryItemId} not found`);
          }

          // Calculate base quantity: convert input quantity to base UOM
          let baseQuantity = Number(quantity) || 0;
          console.log(
            `[InflowCreate] Item ${inventoryItem.name}: inputQuantity=${quantity}, inputUomId=${item.uomId}, baseUomId=${inventoryItem.baseUomId}`
          );

          if (item.uomId !== inventoryItem.baseUomId) {
            try {
              const converted = await this.uomConversionsService.convert(
                businessId,
                item.uomId,
                inventoryItem.baseUomId,
                quantity
              );
              baseQuantity = Number(converted) || Number(quantity) || 0;
              console.log(
                `[InflowCreate] UOM conversion: ${quantity} (${item.uomId}) -> ${baseQuantity} (${inventoryItem.baseUomId})`
              );
            } catch (error) {
              console.error(`[InflowCreate] UOM conversion error:`, error);
              throw new Error(
                `Cannot convert ${quantity} from UOM ${item.uomId} to base UOM ${inventoryItem.baseUomId} for item ${inventoryItem.name}. Please ensure UOM conversion exists.`
              );
            }
          } else {
            console.log(
              `[InflowCreate] Same UOM, baseQuantity = ${baseQuantity}`
            );
          }

          // Ensure baseQuantity is a valid number
          if (
            isNaN(baseQuantity) ||
            baseQuantity == null ||
            baseQuantity === undefined
          ) {
            console.log(
              `[InflowCreate] WARNING: Invalid baseQuantity, falling back to input quantity`
            );
            baseQuantity = Number(quantity) || 0;
          }

          console.log(
            `[InflowCreate] Final baseQuantity for ${inventoryItem.name}: ${baseQuantity}`
          );

          // Update stock using base quantity
          inventoryItem.currentStock =
            Number(inventoryItem.currentStock) + Number(baseQuantity);
          await this.inventoryItemRepository.save(inventoryItem);

          // Use item-level branchId if provided, otherwise use inflow-level branchId (required, so always has a value)
          const itemBranchId = item.branchId || createDto.branchId;
          if (!itemBranchId) {
            throw new Error("Branch ID is required for inflow items");
          }

          // Update branch inventory for the item's branch
          let branchInventory = await this.branchInventoryRepository.findOne({
            where: {
              branchId: itemBranchId,
              inventoryItemId: item.inventoryItemId,
            },
          });

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
          await this.branchInventoryRepository.save(branchInventory);

          // Create batch if trackable
          // Use item-level supplier if provided, otherwise use inflow-level supplier (can be null/undefined)
          const batchSupplierId =
            item.supplierId || createDto.supplierId || null;

          if (inventoryItem.isTrackable) {
            const batch = this.batchRepository.create({
              businessId,
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
            await this.batchRepository.save(batch);
          }

          // Create inflow item entity with both the foreign key ID and the relationship object
          // Setting both ensures TypeORM properly handles the relationship
          // baseQuantity is already calculated above - ensure it's a valid number
          const finalBaseQuantity = Number(baseQuantity);
          if (isNaN(finalBaseQuantity)) {
            throw new Error(
              `Invalid baseQuantity calculated: ${baseQuantity} for item ${item.inventoryItemId}`
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
          });

          console.log(`[InflowCreate] Creating inflow item:`, {
            inflowId: savedInflow.id,
            branchId: itemBranchId,
            supplierId: batchSupplierId,
            inventoryItemId: item.inventoryItemId,
            baseQuantity: finalBaseQuantity,
          });

          const savedItem = await this.inflowItemRepository.save(inflowItem);

          console.log(`[InflowCreate] Saved inflow item:`, {
            id: savedItem.id,
            inflowId: savedItem.inflowId,
            branchId: savedItem.branchId,
            supplierId: savedItem.supplierId,
          });
          return savedItem;
        })
      );
    }

    savedInflow.totalAmount = totalAmount;
    const finalInflow = await this.inflowRepository.save(savedInflow);
    // Reload to ensure all data including items are properly loaded with relations
    return this.findOne(finalInflow.id, businessId);
  }

  async findAll(businessId: string, branchId?: string, batchId?: string) {
    const where: any = { businessId };
    if (branchId) {
      where.branchId = branchId;
    }
    if (batchId) {
      where.batchId = batchId;
    }

    const inflows = await this.inflowRepository.find({
      where,
      relations: [
        "branch",
        "supplier", 
        "items",
        "items.supplier",
        "items.branch",
        "items.inventoryItem",
        "items.inventoryItem.baseUom",
        "items.uom",
      ],
      order: { createdAt: "DESC" },
    });

    console.log(`[DEBUG] Found ${inflows.length} inflows for business ${businessId}`);
    if (inflows.length > 0) {
      const sample = inflows[0];
      console.log(`[DEBUG] First inflow sample:`, {
        id: sample?.id,
        batchId: sample?.batchId,
        branchId: sample?.branchId,
        branchName: sample?.branch?.name,
        branchLoaded: !!sample?.branch,
        totalAmount: sample?.totalAmount,
        type: sample?.type,
        hasItems: sample?.items?.length > 0,
        itemsCount: sample?.items?.length,
        firstItemCost: sample?.items?.[0]?.totalCost
      });
      
      // If branch is null but branchId exists, there's a relation loading issue
      if (sample?.branchId && !sample?.branch) {
        console.log(`[DEBUG] Branch relation failed to load for branchId: ${sample.branchId}`);
        // Try to load branch manually
        const branch = await this.branchRepository.findOne({
          where: { id: sample.branchId, businessId }
        });
        console.log(`[DEBUG] Manual branch lookup result:`, branch ? branch.name : 'not found');
      }
    }

    // Calculate failedUploadsCount and fix missing data for each inflow
    const inflowsWithCounts = await Promise.all(
      inflows.map(async (inflow) => {
        let failedUploadsCount = 0;
        
        console.log(`[DEBUG] Processing inflow ${inflow.id} - batchId: ${inflow.batchId}, branch: ${inflow.branch?.name}, type: ${inflow.type}`);
        
        // Load branch manually if relation failed
        if (inflow.branchId && !inflow.branch) {
          console.log(`[DEBUG] Loading branch manually for inflow ${inflow.id}`);
          const branch = await this.branchRepository.findOne({
            where: { id: inflow.branchId, businessId }
          });
          if (branch) {
            inflow.branch = branch;
            console.log(`[DEBUG] Manually loaded branch: ${branch.name}`);
          }
        }
        
        // Load supplier manually if relation failed
        if (inflow.supplierId && !inflow.supplier) {
          console.log(`[DEBUG] Loading supplier manually for inflow ${inflow.id}`);
          const supplier = await this.supplierRepository.findOne({
            where: { id: inflow.supplierId, businessId }
          });
          if (supplier) {
            inflow.supplier = supplier;
            console.log(`[DEBUG] Manually loaded supplier: ${supplier.name}`);
          }
        }
        
        if (inflow.batchId) {
          // Count failed uploads specifically for this inflow ID
          failedUploadsCount = await this.bulkUploadLogRepository.count({
            where: { 
              businessId,
              uploadType: 'inflow',
              inflowId: inflow.id,
              uploadSessionId: inflow.batchId
            }
          });
          
          console.log(`[DEBUG] Found ${failedUploadsCount} direct failures for inflow ${inflow.id}`);
          
          // If no records found with inflowId, check for validation failures by branch name
          if (failedUploadsCount === 0 && inflow.branch?.name) {
            const qb = this.bulkUploadLogRepository.createQueryBuilder('log');
            failedUploadsCount = await qb
              .where('log.businessId = :businessId', { businessId })
              .andWhere('log.uploadType = :uploadType', { uploadType: 'inflow' })
              .andWhere('log.uploadSessionId = :uploadSessionId', { uploadSessionId: inflow.batchId })
              .andWhere('log.inflowId IS NULL')
              .andWhere("JSON_EXTRACT(log.rowData, '$.branchName') = :branchName", { branchName: inflow.branch.name })
              .getCount();
              
            console.log(`[DEBUG] Found ${failedUploadsCount} validation failures for branch ${inflow.branch.name}`);
          }
        }
        
        console.log(`[DEBUG] Final failedUploadsCount for inflow ${inflow.id}: ${failedUploadsCount}`);
        
        // Recalculate totalAmount from items if it's 0 or null
        let totalAmount = Number(inflow.totalAmount) || 0;
        if (totalAmount === 0 && inflow.items && inflow.items.length > 0) {
          totalAmount = inflow.items.reduce((sum, item) => {
            const itemTotal = Number(item.totalCost) || 0;
            return sum + itemTotal;
          }, 0);
          console.log(`[DEBUG] Recalculated totalAmount for inflow ${inflow.id}: ${totalAmount} (was ${inflow.totalAmount})`);
          
          // Update the database with the correct totalAmount
          if (totalAmount > 0) {
            await this.inflowRepository.update(inflow.id, { totalAmount });
            console.log(`[DEBUG] Updated database totalAmount for inflow ${inflow.id}: ${totalAmount}`);
          }
        }
        
        return {
          ...inflow,
          totalAmount,
          failedUploadsCount
        };
      })
    );

    return inflowsWithCounts;
  }

  async findOne(id: string, businessId: string) {
    const inflow = await this.inflowRepository
      .createQueryBuilder("inflow")
      .leftJoinAndSelect("inflow.branch", "branch")
      .leftJoinAndSelect("inflow.supplier", "supplier")
      .leftJoinAndSelect("inflow.items", "items")
      .leftJoinAndSelect("items.supplier", "itemSupplier")
      .leftJoinAndSelect("items.branch", "itemBranch")
      .leftJoinAndSelect("items.inventoryItem", "inventoryItem")
      .leftJoinAndSelect("inventoryItem.baseUom", "baseUom")
      .leftJoinAndSelect("inventoryItem.category", "category")
      .leftJoinAndSelect("inventoryItem.subcategory", "subcategory")
      .leftJoinAndSelect("items.uom", "uom")
      .where("inflow.id = :id", { id })
      .andWhere("inflow.businessId = :businessId", { businessId })
      .getOne();

    if (!inflow) {
      throw new NotFoundException("Inventory inflow not found");
    }

    // Manually load inflow-level supplier and branch if not loaded
    const inflowSupplierId = (inflow as any).supplierId;
    const inflowBranchId = (inflow as any).branchId;
    if (inflowSupplierId && !(inflow as any).supplier) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: inflowSupplierId, businessId },
      });
      if (supplier) {
        (inflow as any).supplier = supplier;
      }
    }
    if (inflowBranchId && !(inflow as any).branch) {
      const branch = await this.branchRepository.findOne({
        where: { id: inflowBranchId, businessId },
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
                businessId,
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
                businessId,
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
                businessId,
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
                businessId,
                id: uomIdsArray.length === 1 ? uomIdsArray[0] : In(uomIdsArray),
              },
            })
          : [],
      ]);

      // Create maps for quick lookup
      const suppliersMap = new Map<string, Supplier>(
        suppliers.map((s) => [s.id, s] as [string, Supplier])
      );
      const branchesMap = new Map<string, Branch>(
        branches.map((b) => [b.id, b] as [string, Branch])
      );
      const inventoryItemsMap = new Map<string, InventoryItem>(
        inventoryItems.map((i) => [i.id, i] as [string, InventoryItem])
      );
      const uomsMap = new Map<string, Uom>(
        uoms.map((u) => [u.id, u] as [string, Uom])
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

  async findOneWithSalesData(id: string, businessId: string) {
    const inflow = await this.findOne(id, businessId);

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
              AND o.business_id = $2
              AND o.status != 'cancelled'
          `;

          console.log(
            `[InflowSalesData] Querying sales for inflow item: ${item.id}, businessId: ${businessId}`
          );
          const salesData = await this.orderItemInflowItemRepository.query(
            salesQuery,
            [item.id, businessId]
          );

          console.log(
            `[InflowSalesData] Raw query result for item ${item.id}:`,
            JSON.stringify(salesData)
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

          console.log(
            `[InflowSalesData] Sales data for item ${item.id}:`,
            sales
          );

          const totalSold = Number(sales.totalsold || 0);
          // Use baseQuantity, but fall back to quantity if baseQuantity is 0 (data integrity issue)
          const baseQuantity =
            Number(item.baseQuantity || 0) || Number(item.quantity || 0);
          const remainingQuantity = Math.max(0, baseQuantity - totalSold);

          console.log(
            `[InflowSalesData] Final values for item ${item.id}: baseQuantity=${baseQuantity}, quantity=${item.quantity}, totalSold=${totalSold}, remainingQuantity=${remainingQuantity}`
          );

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
        } catch (error) {
          console.error(
            "Error getting sales data for inflow item:",
            item.id,
            error
          );
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
      })
    );

    return {
      ...inflow,
      items: itemsWithSalesData,
    };
  }

  async update(
    id: string,
    businessId: string,
    updateDto: UpdateInventoryInflowDto
  ) {
    await this.findOne(id, businessId);
    await this.inflowRepository.update({ id }, updateDto);
    return this.findOne(id, businessId);
  }

  async approve(id: string, businessId: string, approvedBy: string) {
    const inflow = await this.findOne(id, businessId);
    inflow.status = "approved";
    inflow.approvedBy = approvedBy;
    inflow.approvedAt = new Date();
    return this.inflowRepository.save(inflow);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.inflowRepository.delete({ id });
  }

  async generateTemplate(): Promise<string> {
    // User-friendly template with names instead of IDs
    // Format: Branch Name | Supplier Name | Received At (optional, YYYY-MM-DD) | Inventory Item Name | UOM | Quantity | Cost Per Unit | Batch Number (optional) | Expiry Date (optional, YYYY-MM-DD) | Invoice Number (optional) | Notes (optional)
    const headers = [
      "Branch Name",
      "Supplier Name",
      "Received At (optional, YYYY-MM-DD)",
      "Inventory Item Name",
      "UOM",
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

  async bulkUpload(businessId: string, csv: string): Promise<BulkUploadResult> {
    const errors: string[] = [];
    const failedUploads: FailedInflowUpload[] = [];
    let duplicateSkipped = 0;
    
    // Generate a 6-character uppercase batch ID (e.g., A1B2C3)
    const generateBatchId = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    const batchId = generateBatchId();
    const uploadSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Bulk upload started with batch ID: ${batchId}`);
    
    const lines = csv.trim().split("\n");

    console.log(`Bulk upload started: ${lines.length} lines`);
    if (lines.length < 2) {
      return {
        success: 0,
        errors: ["CSV file is empty"],
        failedUploads: [],
        duplicateSkipped: 0,
      };
    }

    // Parse header
    const header = lines[0];
    const headers = header
      .split(/[\t|,]/)
      .map((h) => (h || "").trim().toLowerCase());

    // Normalize function
    const normalize = (value: string) =>
      value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    const normalizedHeaders = headers.map(normalize);

    // Required headers
    const requiredHeaders = [
      "branch name",
      "inventory item name",
      "uom",
      "quantity",
      "cost per unit",
    ].map(normalize);

    // Find missing headers
    const missingHeaders = requiredHeaders.filter(
      (req) => !normalizedHeaders.includes(req)
    );

    if (missingHeaders.length > 0) {
      return {
        success: 0,
        errors: [`Missing required headers: ${missingHeaders.join(", ")}`],
        failedUploads: [],
        duplicateSkipped: 0,
      };
    }

    // Parse data lines
    const parsedRows: ParsedInflowRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      const values = line.split(/[\t|,]/).map((v) => (v || "").trim());

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
      };
    }

    console.log('DEBUG - Parsed rows before validation:', parsedRows.length);
    console.log('DEBUG - Sample parsed row:', parsedRows[0]);
    console.log('DEBUG - Business ID:', businessId);

    // Lookup and validate entities in bulk
    await this.validateAndLookupEntities(businessId, parsedRows, failedUploads);

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
      };
    }

    // Process UOM conversions and detect duplicates
    const processedRows = await this.processUomConversionsAndDuplicates(
      businessId,
      validRows,
      failedUploads,
      uploadSessionId
    );

    // Count duplicates that were skipped
    duplicateSkipped = failedUploads.filter(
      (f) => f.status === "skipped"
    ).length;

    // Filter final valid rows
    const finalValidRows = processedRows.filter(
      (row) => row.baseQuantity !== undefined
    );

    if (finalValidRows.length === 0) {
      return {
        success: 0,
        errors: ["No valid rows after UOM conversion and duplicate detection"],
        failedUploads,
        duplicateSkipped,
      };
    }

    // Create inflows by branch
    const successCount = await this.createInflowsByBranch(
      businessId,
      finalValidRows,
      uploadSessionId,
      batchId,
      failedUploads
    );

    return {
      success: successCount,
      errors,
      failedUploads,
      duplicateSkipped,
    };
  }

  // Helper method to validate and lookup entities in bulk
  private async validateAndLookupEntities(
    businessId: string,
    parsedRows: ParsedInflowRow[],
    failedUploads: FailedInflowUpload[]
  ): Promise<void> {
    // Get unique entity names for bulk lookups
    const uniqueBranchNames = [...new Set(parsedRows.map((r) => r.branchName))];
    const uniqueItemNames = [
      ...new Set(parsedRows.map((r) => r.inventoryItemName)),
    ];
    const uniqueUomNames = [...new Set(parsedRows.map((r) => r.uomName))];
    const uniqueSupplierNames = [
      ...new Set(
        parsedRows.map((r) => r.supplierName).filter(Boolean) as string[]
      ),
    ];

    // Bulk entity lookups
    const [branches, inventoryItems, uoms, suppliers] = await Promise.all([
      this.branchRepository.find({
        where: { businessId, name: In(uniqueBranchNames) },
      }),
      this.inventoryItemRepository.find({
        where: { businessId, name: In(uniqueItemNames) },
        relations: ["baseUom"],
      }),
      this.uomRepository.find({
        where: { businessId, name: In(uniqueUomNames) },
      }),
      uniqueSupplierNames.length > 0
        ? this.supplierRepository.find({
            where: { businessId, name: In(uniqueSupplierNames) },
          })
        : [],
    ]);

    console.log('DEBUG - Entity lookup results:');
    console.log(`- Branches found: ${branches.length}/${uniqueBranchNames.length}`, branches.map(b => b.name));
    console.log(`- Items found: ${inventoryItems.length}/${uniqueItemNames.length}`, inventoryItems.map(i => i.name));
    console.log(`- UOMs found: ${uoms.length}/${uniqueUomNames.length}`, uoms.map(u => u.name));
    console.log(`- Suppliers found: ${suppliers.length}/${uniqueSupplierNames.length}`, suppliers.map(s => s.name));
    console.log('- Expected branch names:', uniqueBranchNames);
    console.log('- Expected item names:', uniqueItemNames);
    console.log('- Expected UOM names:', uniqueUomNames);

    // Create lookup maps with proper typing
    const branchMap = new Map<string, Branch>();
    branches.forEach((b) => branchMap.set(b.name.toLowerCase(), b));

    const itemMap = new Map<string, InventoryItem>();
    inventoryItems.forEach((i) => itemMap.set(i.name.toLowerCase(), i));

    const uomMap = new Map<string, Uom>();
    uoms.forEach((u) => uomMap.set(u.name.toLowerCase(), u));

    const supplierMap = new Map<string, Supplier>();
    suppliers.forEach((s) => supplierMap.set(s.name.toLowerCase(), s));

    // Validate and enrich each row
    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const lineNumber = i + 2; // Account for header and 0-based index
      const rowErrors: string[] = [];

      // Validate and set branch
      const branch = branchMap.get(row.branchName.toLowerCase());
      if (!branch) {
        rowErrors.push(`Branch '${row.branchName}' not found`);
      } else {
        row.branchId = branch.id;
      }

      // Validate and set inventory item
      const inventoryItem = itemMap.get(row.inventoryItemName.toLowerCase());
      if (!inventoryItem) {
        rowErrors.push(`Inventory item '${row.inventoryItemName}' not found`);
      } else {
        row.inventoryItemId = inventoryItem.id;
        row.inventoryItem = inventoryItem;
      }

      // Validate and set UOM
      const uom = uomMap.get(row.uomName.toLowerCase());
      if (!uom) {
        rowErrors.push(`UOM '${row.uomName}' not found`);
      } else {
        row.uomId = uom.id;
        row.uom = uom;
      }

      // Validate and set supplier (auto-create if doesn't exist)
      if (row.supplierName) {
        let supplier = supplierMap.get(row.supplierName.toLowerCase());
        if (!supplier) {
          // Auto-create supplier if it doesn't exist
          try {
            const newSupplier = this.supplierRepository.create({
              businessId,
              name: row.supplierName,
              contactPerson: '',
              phone: '',
              email: '',
              address: '',
            });
            supplier = await this.supplierRepository.save(newSupplier);
            supplierMap.set(row.supplierName.toLowerCase(), supplier);
            console.log(`Auto-created supplier: ${row.supplierName}`);
          } catch (error: any) {
            console.error(`Failed to auto-create supplier ${row.supplierName}:`, error);
            rowErrors.push(`Failed to create supplier '${row.supplierName}': ${error.message}`);
          }
        }
        if (supplier) {
          row.supplierId = supplier.id;
        }
      }

      // If validation failed, add to failed uploads
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

  // Helper method to process UOM conversions and detect duplicates
  private async processUomConversionsAndDuplicates(
    businessId: string,
    validRows: ParsedInflowRow[],
    failedUploads: FailedInflowUpload[],
    uploadSessionId: string
  ): Promise<ParsedInflowRow[]> {
    const processedRows: ParsedInflowRow[] = [];
    const seenItems = new Set<string>(); // Track duplicates within upload

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const lineNumber = i + 2; // Account for header and previous failed rows
      const rowErrors: string[] = [];

      try {
        // Check for duplicates within the same upload
        const itemKey = `${row.branchId}-${row.inventoryItemId}-${row.batchNumber || "no-batch"}`;
        if (seenItems.has(itemKey)) {
          failedUploads.push({
            lineNumber,
            rowData: {
              "branch name": row.branchName,
              "inventory item name": row.inventoryItemName,
              uom: row.uomName,
              quantity: row.quantity.toString(),
              "cost per unit": row.costPerUnit.toString(),
            },
            errors: [
              `Duplicate inflow item within upload: ${row.inventoryItemName} for branch ${row.branchName}`,
            ],
            status: "skipped",
          });
          continue;
        }
        seenItems.add(itemKey);

        // Convert UOM to base UOM if necessary
        if (!row.inventoryItem || !row.uom) {
          rowErrors.push("Missing inventory item or UOM data");
        } else if (row.uomId === row.inventoryItem.baseUomId) {
          // UOM matches base UOM, no conversion needed
          row.baseQuantity = row.quantity;
        } else {
          // Convert to base UOM using the UOM conversion service
          try {
            const baseQuantity = await this.uomConversionsService.convert(
              businessId,
              row.uomId!, // From UOM (specified in CSV)
              row.inventoryItem.baseUomId, // To UOM (base UOM)
              row.quantity
            );
            row.baseQuantity = baseQuantity;
          } catch (conversionError: any) {
            rowErrors.push(
              `UOM conversion failed: ${conversionError.message}. Item '${row.inventoryItemName}' does not support UOM '${row.uomName}'`
            );
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
            },
            errors: rowErrors,
            status: "failed",
          });
        } else {
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
          errors: [`Processing error: ${error.message}`],
          status: "failed",
        });
      }
    }

    return processedRows;
  }

  // Helper method to create inflows by branch
  private async createInflowsByBranch(
    businessId: string,
    validRows: ParsedInflowRow[],
    uploadSessionId: string,
    batchId: string,
    failedUploads: FailedInflowUpload[]
  ): Promise<number> {
    // Group rows by branch
    const rowsByBranch = new Map<string, ParsedInflowRow[]>();

    for (const row of validRows) {
      const branchId = row.branchId!;
      if (!rowsByBranch.has(branchId)) {
        rowsByBranch.set(branchId, []);
      }
      rowsByBranch.get(branchId)!.push(row);
    }

    let successCount = 0;

    // Create separate inflow for each branch
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

        // Combine notes from all rows for this branch
        const noteParts: string[] = [];
        branchRows.forEach((row) => {
          if (row.notes && typeof row.notes === "string" && row.notes.trim()) {
            const itemName = row.inventoryItemName || "Item";
            const supplierName = row.supplierName || "No Supplier";
            noteParts.push(
              `${itemName} - ${supplierName} - ${row.notes.trim()}`
            );
          }
        });
        const combinedNotes =
          noteParts.length > 0 ? noteParts.join(" | ") : undefined;

        // Build items array using UOM from CSV and converted base quantities
        const items = branchRows.map((row) => ({
          inventoryItemId: row.inventoryItemId!,
          uomId: row.uomId!, // Use the UOM specified in CSV
          quantity: row.quantity, // Original quantity in specified UOM
          unitCost: row.costPerUnit,
          batchNumber: row.batchNumber,
          expiryDate: row.expiryDate,
          notes: row.notes,
          supplierId: row.supplierId || undefined,
        }));

        // Create inflow for this specific branch
        const createDto: CreateInventoryInflowDto = {
          branchId: branchId,
          supplierId: commonSupplierId,
          receivedDate: commonReceivedAt,
          invoiceNumber: commonInvoiceNumber,
          notes: combinedNotes,
          items: items,
        };

        // Create the inflow - this will properly update branch inventory for the correct branch
        const savedInflow = await this.create(businessId, createDto);
        
        // Update the saved inflow with the batch ID (6-character batch ID)
        savedInflow.batchId = batchId;
        savedInflow.type = 'bulk';
        await this.inflowRepository.save(savedInflow);
        
        successCount++;

        // Log failed uploads to database
        if (failedUploads.length > 0) {
          const logEntries = failedUploads.map((failed) =>
            this.bulkUploadLogRepository.create({
              businessId,
              uploadType: "inflow",
              inflowId: savedInflow.id,
              lineNumber: failed.lineNumber,
              rowData: failed.rowData,
              errorMessages: failed.errors,
              status: failed.status,
              uploadSessionId,
            })
          );

          // Save in batches to avoid overwhelming the database
          const batchSize = 50;
          for (let i = 0; i < logEntries.length; i += batchSize) {
            const batch = logEntries.slice(i, i + batchSize);
            await this.bulkUploadLogRepository.save(batch);
          }
        }
      } catch (error: any) {
        // Log the error for this branch
        const branchName = branchRows[0].branchName;
        const errorLogEntry = this.bulkUploadLogRepository.create({
          businessId,
          uploadType: "inflow",
          lineNumber: 0, // Branch-level error
          rowData: {
            branchName,
            error: "Failed to create inflow for entire branch",
          },
          errorMessages: [
            `Failed to create inflow for branch ${branchName}: ${error.message || "Unknown error"}`,
          ],
          status: "failed",
          uploadSessionId,
        });
        await this.bulkUploadLogRepository.save(errorLogEntry);
      }
    }

    return successCount;
  }
}
