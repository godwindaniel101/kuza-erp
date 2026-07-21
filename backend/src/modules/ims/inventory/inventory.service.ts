import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, DataSource } from "typeorm";
import { Transactional } from "typeorm-transactional";
import { InventoryItem } from "../entities/inventory-item.entity";
import { InventoryItemComponent } from "../entities/inventory-item-component.entity";
import { BranchInventoryItem } from "../entities/branch-inventory-item.entity";
import { CreateInventoryItemDto, ItemComponentDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";
import { UomConversionsService } from "../uom-conversions/uom-conversions.service";
import { Uom } from "../entities/uom.entity";
import { Branch } from "../../../common/entities/branch.entity";
import { InventoryCategory } from "../entities/inventory-category.entity";
import { InventorySubcategory } from "../entities/inventory-subcategory.entity";
import { OrderItem } from "../../rms/entities/order-item.entity";
import { Order } from "../../rms/entities/order.entity";
import { InventoryInflowItem } from "../entities/inventory-inflow-item.entity";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as sharp from "sharp";

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryItemComponent)
    private componentRepository: Repository<InventoryItemComponent>,
    @InjectRepository(BranchInventoryItem)
    private branchInventoryRepository: Repository<BranchInventoryItem>,
    @InjectRepository(Uom)
    private uomRepository: Repository<Uom>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(InventoryCategory)
    private categoryRepository: Repository<InventoryCategory>,
    @InjectRepository(InventorySubcategory)
    private subcategoryRepository: Repository<InventorySubcategory>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private uomConversionsService: UomConversionsService,
    private dataSource: DataSource,
  ) {}

  async create(
    createDto: CreateInventoryItemDto,
    actor?: { id?: string; name?: string },
  ) {
    // Validate category if provided
    if (createDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: createDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException("Category not found");
      }
    }

    // Validate subcategory if provided
    if (createDto.subcategoryId) {
      const subcategory = await this.subcategoryRepository.findOne({
        where: { id: createDto.subcategoryId },
      });
      if (!subcategory) {
        throw new NotFoundException("Subcategory not found");
      }
      // Ensure subcategory belongs to the selected category
      if (
        createDto.categoryId &&
        subcategory.categoryId !== createDto.categoryId
      ) {
        throw new NotFoundException(
          "Subcategory does not belong to the selected category",
        );
      }
    }

    const { components, ...itemFields } = createDto;
    const item = this.inventoryItemRepository.create({
      ...itemFields,
      // For tracked items, real cost comes from inflow batches; for untracked /
      // composed items the provided unitCost is the manual cost price.
      unitCost: createDto.unitCost ?? 0,
      createdBy: actor?.id || null,
      createdByName: actor?.name || null,
      updatedBy: actor?.id || null,
      updatedByName: actor?.name || null,
    });
    const savedItem = await this.inventoryItemRepository.save(item);

    if (components && components.length > 0) {
      await this.setItemComponents(savedItem.id, components);
    }

    // Explicitly load the item with relations to ensure they're available immediately
    const itemWithRelations = await this.inventoryItemRepository.findOne({
      where: { id: savedItem.id },
      relations: ["category", "subcategory", "baseUom"],
    });

    return itemWithRelations || savedItem;
  }

  /**
   * Replace an item's make-up (bill of materials). v1 rule: components must be
   * raw items — a component may not itself have components (no nested make-up).
   */
  async setItemComponents(itemId: string, components: ItemComponentDto[]) {
    const lines = (components || []).filter((c) => c.componentItemId);
    const ids = lines.map((c) => c.componentItemId);

    if (ids.length) {
      if (ids.includes(itemId)) {
        throw new BadRequestException("An item cannot be an ingredient of itself.");
      }
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException("The same ingredient is listed more than once.");
      }
      const found = await this.inventoryItemRepository.find({ where: { id: In(ids) } });
      if (found.length !== ids.length) {
        throw new BadRequestException("One or more ingredient items were not found.");
      }
      // Enforce raw-only ingredients (no nested make-up).
      const nested = await this.componentRepository.find({
        where: { parentItemId: In(ids) },
      });
      if (nested.length > 0) {
        throw new BadRequestException(
          "Ingredients must be raw items — one of them is itself made up of other items.",
        );
      }
    }

    await this.componentRepository.delete({ parentItemId: itemId });
    if (lines.length) {
      await this.componentRepository.save(
        lines.map((c) =>
          this.componentRepository.create({
            parentItemId: itemId,
            componentItemId: c.componentItemId,
            quantity: c.quantity,
            uomId: c.uomId ?? null,
          }),
        ),
      );
    }
  }

  async findAll(branchId?: string) {
    // Use QueryBuilder to ensure relations are properly loaded
    const items = await this.inventoryItemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.baseUom", "baseUom")
      .leftJoinAndSelect("item.branches", "branches")
      .leftJoinAndSelect("branches.branch", "branch")
      .leftJoinAndSelect("item.category", "category")
      .leftJoinAndSelect("item.subcategory", "subcategory")
      .orderBy("item.name", "ASC")
      .getMany();

    // Guard: return early if no items
    if (!items || items.length === 0) {
      return [];
    }

    // Get all UOM conversions and all UOMs for this business
    const [conversions, allUoms] = await Promise.all([
      this.uomConversionsService.findAll(),
      this.uomRepository.find({}),
    ]);

    // Create a map of all UOMs for quick lookup
    const allUomsMap = new Map<string, Uom>();
    allUoms.forEach((uom) => {
      if (uom && uom.id) {
        allUomsMap.set(uom.id, uom);
      }
    });

    // Collect all unique IDs for manual loading (in case relations don't load due to tenant isolation)
    const categoryIds = [
      ...new Set(items.map((item) => item.categoryId).filter(Boolean)),
    ];
    const subcategoryIds = [
      ...new Set(items.map((item) => item.subcategoryId).filter(Boolean)),
    ];
    const baseUomIds = [
      ...new Set(items.map((item) => item.baseUomId).filter(Boolean)),
    ];

    // Manually load baseUoms with  constraint (use already loaded allUomsMap as fallback)
    const baseUomsMap = new Map<string, Uom>();
    if (baseUomIds.length > 0) {
      const baseUoms = await this.uomRepository.find({
        where: {
          id: baseUomIds.length === 1 ? baseUomIds[0] : In(baseUomIds),
        },
      });
      baseUoms.forEach((uom) => {
        if (uom && uom.id) {
          baseUomsMap.set(uom.id, uom);
          // Also add to allUomsMap if not already there
          if (!allUomsMap.has(uom.id)) {
            allUomsMap.set(uom.id, uom);
          }
        }
      });
    }

    // Manually load categories and subcategories with constraint (fallback for QueryBuilder)
    const categoriesMap = new Map<string, InventoryCategory>();
    if (categoryIds.length > 0) {
      const categories = await this.categoryRepository.find({
        where: {
          id: categoryIds.length === 1 ? categoryIds[0] : In(categoryIds),
        },
      });
      categories.forEach((cat) => {
        if (cat && cat.id) {
          categoriesMap.set(cat.id, cat);
        }
      });
    }

    const subcategoriesMap = new Map<string, InventorySubcategory>();
    if (subcategoryIds.length > 0) {
      const subcategories = await this.subcategoryRepository.find({
        where: {
          id:
            subcategoryIds.length === 1
              ? subcategoryIds[0]
              : In(subcategoryIds),
        },
      });
      subcategories.forEach((sub) => {
        if (sub && sub.id) {
          subcategoriesMap.set(sub.id, sub);
        }
      });
    }

    const itemsWithUoms = items
      .filter((item) => item && item.id && item.baseUomId) // Filter out items without required fields
      .map((item) => {
        const baseUomId = item.baseUomId;

        // Use manually loaded baseUom if relation didn't load
        const baseUom =
          item.baseUom || (baseUomId ? baseUomsMap.get(baseUomId) : null);

        // Build UOM list using BFS to find all convertible UOMs (direct and indirect)
        // Start with base UOM
        const uoms = [
          {
            id: baseUom?.id || baseUomId || "",
            name: baseUom?.name || "Unknown",
            abbreviation: baseUom?.abbreviation || "",
          },
        ];

        // Build conversion graph (bidirectional) for BFS
        const graph: Record<string, string[]> = {};

        // Initialize graph with all UOM IDs
        allUoms.forEach((uom) => {
          if (uom && uom.id) {
            graph[uom.id] = [];
          }
        });

        // Build edges from conversions (bidirectional)
        conversions.forEach((conv) => {
          // Use IDs directly (relations may not load due to tenant isolation)
          const fromId = (conv as any).fromUomId;
          const toId = (conv as any).toUomId;

          // Skip conversions with missing IDs
          if (!fromId || !toId) {
            return;
          }

          // Initialize nodes if not already present
          if (!graph[fromId]) graph[fromId] = [];
          if (!graph[toId]) graph[toId] = [];

          // Add edges (bidirectional)
          if (!graph[fromId].includes(toId)) {
            graph[fromId].push(toId);
          }
          if (!graph[toId].includes(fromId)) {
            graph[toId].push(fromId);
          }
        });

        // BFS to find all reachable UOMs from base UOM (including indirect conversions)
        const reachable: Record<string, boolean> = { [baseUomId]: true };
        const queue: string[] = [baseUomId];

        while (queue.length > 0) {
          const current = queue.shift()!;
          const neighbors = graph[current] || [];

          for (const neighbor of neighbors) {
            if (!reachable[neighbor]) {
              reachable[neighbor] = true;
              queue.push(neighbor);

              // Add to uoms list if not already present - get UOM from allUomsMap
              const uom = allUomsMap.get(neighbor);
              if (uom && !uoms.find((u) => u.id === neighbor)) {
                uoms.push({
                  id: uom.id,
                  name: uom.name || "Unknown",
                  abbreviation: uom.abbreviation || "",
                });
              }
            }
          }
        }

        // Use manually loaded category/subcategory if relation didn't load (should be rare with QueryBuilder)
        const category =
          item.category ||
          (item.categoryId ? categoriesMap.get(item.categoryId) : null);
        const subcategory =
          item.subcategory ||
          (item.subcategoryId
            ? subcategoriesMap.get(item.subcategoryId)
            : null);

        const result: any = {
          ...item,
          uoms,
          category: category?.name || null,
          subcategory: subcategory?.name || null,
          categoryId: item.categoryId || null,
          subcategoryId: item.subcategoryId || null,
        };

        if (branchId) {
          result.branchStock =
            item.branches?.find((b) => b && b.branchId === branchId) || null;
        }

        return result;
      });

    await this.attachBatchAndExpiry(itemsWithUoms);

    return itemsWithUoms;
  }

  /**
   * Attach per-item inflow-batch aggregates (mutates each row in place):
   *  - batchCount: number of inflow batches (lots) with stock remaining
   *  - earliestExpiry: the next upcoming batch expiry date (or null)
   *  - expiringSoonCount: batches expiring within 30 days
   * Powers the list "Batches" / "Expiring soon" columns and the dashboard
   * "Expiring soon" widget. One grouped query for the whole page of items.
   */
  private async attachBatchAndExpiry(items: any[]): Promise<void> {
    const ids = (items || []).map((i) => i?.id).filter(Boolean);
    if (ids.length === 0) return;
    const rows = await this.inventoryItemRepository.manager.query(
      `SELECT inventory_item_id AS id,
              COUNT(*) FILTER (WHERE base_quantity > 0) AS batch_count,
              MIN(expiry_date) FILTER (WHERE expiry_date >= CURRENT_DATE) AS next_expiry,
              COUNT(*) FILTER (
                WHERE expiry_date >= CURRENT_DATE
                  AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
              ) AS soon_count
       FROM inventory_inflow_items
       WHERE inventory_item_id = ANY($1::uuid[])
       GROUP BY inventory_item_id`,
      [ids],
    );
    const byId = new Map<string, any>((rows || []).map((r: any) => [r.id, r]));
    items.forEach((it: any) => {
      const r = byId.get(it.id);
      it.batchCount = Number(r?.batch_count || 0);
      it.earliestExpiry = r?.next_expiry || null;
      it.expiringSoonCount = Number(r?.soon_count || 0);
    });
  }

  async findAllWithBranchStock() {
    // Use query builder to ensure all relations load correctly
    const items = await this.inventoryItemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.baseUom", "baseUom")
      .leftJoinAndSelect("item.branches", "branches")
      .leftJoinAndSelect("item.category", "category")
      .leftJoinAndSelect("item.subcategory", "subcategory")
      .orderBy("item.name", "ASC")
      .getMany();

    // Get all branches for this business
    const branches = await this.branchRepository.find({
      order: { isDefault: "DESC", name: "ASC" },
    });

    // Load all baseUoms in batch if any are missing
    const baseUomIds = items.map((item) => item.baseUomId).filter(Boolean);
    const baseUomsMap = new Map<string, Uom>();
    if (baseUomIds.length > 0) {
      const baseUoms = await this.uomRepository.find({
        where: { id: In(baseUomIds) },
      });
      baseUoms.forEach((uom) => {
        if (uom && uom.id) {
          baseUomsMap.set(uom.id, uom);
        }
      });
    }

    // Load all categories in batch if any are missing
    const categoryIds = items.map((item) => item.categoryId).filter(Boolean);
    const categoriesMap = new Map<string, InventoryCategory>();
    if (categoryIds.length > 0) {
      const categories = await this.categoryRepository.find({
        where: { id: In(categoryIds) },
      });
      categories.forEach((cat) => {
        if (cat && cat.id) {
          categoriesMap.set(cat.id, cat);
        }
      });
    }

    // Load all subcategories in batch if any are missing
    const subcategoryIds = items
      .map((item) => item.subcategoryId)
      .filter(Boolean);
    const subcategoriesMap = new Map<string, InventorySubcategory>();
    if (subcategoryIds.length > 0) {
      const subcategories = await this.subcategoryRepository.find({
        where: { id: In(subcategoryIds) },
      });
      subcategories.forEach((sub) => {
        if (sub && sub.id) {
          subcategoriesMap.set(sub.id, sub);
        }
      });
    }

    // Manually load all branch inventory items if relation didn't load properly
    // This ensures branch inventory is always loaded correctly, even if the relation doesn't load
    const itemIds = items.map((item) => item.id).filter(Boolean);
    let allBranchInventoryItems: BranchInventoryItem[] = [];

    if (itemIds.length > 0) {
      allBranchInventoryItems = await this.branchInventoryRepository.find({
        where: {
          inventoryItemId: In(itemIds),
        },
      });
    }

    // Create a map of branch inventory items by itemId and branchId for quick lookup
    const branchInventoryMap = new Map<string, BranchInventoryItem>();
    allBranchInventoryItems.forEach((bi) => {
      const key = `${bi.inventoryItemId}-${bi.branchId}`;
      branchInventoryMap.set(key, bi);
    });

    // Guard: return early if no items
    if (!items || items.length === 0) {
      return [];
    }

    const mapped = items
      .map((item) => {
        // Guard: skip items without ID
        if (!item || !item.id) {
          return null;
        }

        // Create a map of branch stocks
        const branchStocks: Record<string, any> = {};
        let totalStock = 0;

        branches.forEach((branch) => {
          // Guard: skip null branches
          if (!branch || !branch.id) {
            return;
          }

          // Try to get from relation first, then fallback to manual map
          let branchItem =
            item.branches?.find((b: any) => b && b.branchId === branch.id) ||
            null;

          // If not found in relation, try manual map
          if (!branchItem && item.id) {
            const key = `${item.id}-${branch.id}`;
            branchItem = branchInventoryMap.get(key) || null;
          }

          const stock = branchItem ? Number(branchItem.currentStock || 0) : 0;
          totalStock += stock;

          branchStocks[branch.id] = {
            stock,
            minimumStock:
              branchItem &&
              branchItem.minimumStock !== null &&
              branchItem.minimumStock !== undefined
                ? Number(branchItem.minimumStock || 0)
                : null,
            maximumStock:
              branchItem &&
              branchItem.maximumStock !== null &&
              branchItem.maximumStock !== undefined
                ? Number(branchItem.maximumStock || 0)
                : null,
            salePrice:
              branchItem && branchItem.salePrice
                ? Number(branchItem.salePrice || 0)
                : null,
            binLocation: branchItem?.binLocation || null,
          };
        });

        // Get baseUom name - prefer loaded relation, fallback to map
        const baseUom =
          item.baseUom ||
          (item.baseUomId ? baseUomsMap.get(item.baseUomId) : null);
        const unitName = baseUom?.name || "Unknown";

        // Get category name - prefer loaded relation, fallback to map
        const category =
          item.category ||
          (item.categoryId ? categoriesMap.get(item.categoryId) : null);
        const categoryName = category?.name || null;

        // Get subcategory name - prefer loaded relation, fallback to map
        const subcategory =
          item.subcategory ||
          (item.subcategoryId
            ? subcategoriesMap.get(item.subcategoryId)
            : null);
        const subcategoryName = subcategory?.name || null;

        return {
          id: item.id,
          name: item.name || "",
          category: categoryName,
          subcategory: subcategoryName,
          categoryId: item.categoryId || null,
          subcategoryId: item.subcategoryId || null,
          unit: unitName,
          baseUomId: item.baseUomId || null,
          isTrackable: item.isTrackable !== false,
          binLocation: item.binLocation || null,
          branchStocks,
          totalStock,
          minimumStock: Number(item.minimumStock || 0),
          maximumStock: Number(item.maximumStock || 0),
          salePrice: Number(item.salePrice || 0),
        };
      })
      .filter((item) => item !== null); // Filter out any null items

    await this.attachBatchAndExpiry(mapped as any[]);
    return mapped;
  }

  async findOne(id: string) {
    const item = await this.inventoryItemRepository.findOne({
      where: { id },
      relations: [
        "baseUom",
        "branches",
        "branches.branch",
        "batches",
        "category",
        "subcategory",
      ],
    });

    if (!item) {
      throw new NotFoundException("Inventory item not found");
    }

    // Make-up (components), so the edit form can prefill the recipe.
    const components = await this.componentRepository.find({
      where: { parentItemId: id },
      order: { createdAt: "ASC" },
    });

    return {
      ...item,
      category: item.category?.name || null,
      subcategory: item.subcategory?.name || null,
      components: components.map((c) => ({
        componentItemId: c.componentItemId,
        quantity: Number(c.quantity),
        uomId: c.uomId,
      })),
    };
  }

  async getItemStats(id: string) {
    // Get the item with basic info
    const item = await this.findOne(id);

    // Get branch stocks using Query Builder for safety
    const branchStocks = await this.branchInventoryRepository
      .createQueryBuilder("bs")
      .leftJoinAndSelect("bs.branch", "branch")
      .where("bs.inventoryItemId = :id", { id })
      .getMany();

    // Resolve branch names via a direct lookup keyed by id. The bs.branch
    // relation can hydrate null (tenant-schema join quirk), which surfaced as
    // "Unknown Branch"; this map guarantees a real name when the branch exists.
    const branchIdList = branchStocks
      .map((bs) => bs.branchId)
      .filter((v): v is string => Boolean(v));
    const branchRecords = branchIdList.length
      ? await this.branchRepository.find({ where: { id: In(branchIdList) } })
      : [];
    const branchNameById = new Map(branchRecords.map((b) => [b.id, b.name]));
    const resolveBranchName = (bs: any) =>
      branchNameById.get(bs.branchId) || bs.branch?.name || "Unknown Branch";

    // Use Query Builder for all stats to ensure tenant isolation
    const salesQuery = this.orderItemRepository
      .createQueryBuilder("oi")
      .select("COUNT(DISTINCT oi.orderId)", "orderCount")
      .addSelect("SUM(oi.quantityBase)", "totalQuantitySold")
      .addSelect("SUM(oi.totalPrice)", "totalSalesAmount")
      .addSelect("SUM(oi.costTotal)", "totalCost")
      .innerJoin("oi.order", "o")
      .where("oi.inventoryItemId = :id", { id });

    const recentSalesQuery = this.orderItemRepository
      .createQueryBuilder("oi")
      .select("SUM(oi.quantityBase)", "recentQuantity")
      .addSelect("SUM(oi.totalPrice)", "recentAmount")
      .innerJoin("oi.order", "o")
      .where("oi.inventoryItemId = :id", { id })
      .andWhere("o.createdAt >= NOW() - INTERVAL '30 days'");

    const salesByBranchQuery = this.orderItemRepository
      .createQueryBuilder("oi")
      .select("o.branchId", "branchid")
      .addSelect("b.name", "branchname")
      .addSelect("COUNT(DISTINCT oi.orderId)", "ordercount")
      .addSelect("SUM(oi.quantityBase)", "totalquantity")
      .addSelect("SUM(oi.totalPrice)", "totalamount")
      .addSelect("SUM(oi.costTotal)", "totalcost")
      .innerJoin("oi.order", "o")
      .innerJoin("o.branch", "b")
      .where("oi.inventoryItemId = :id", { id })
      .groupBy("o.branchId, b.name")
      .orderBy("totalamount", "DESC");

    // Per-sale and per-receipt history use RAW SQL with explicit table joins
    // instead of QueryBuilder relation joins (`oi.order`, `ii.inflow`, …). Under
    // the tenant schema those relation joins can fail to hydrate — the documented
    // recurring bug that left inflow date/supplier and sales history empty — so
    // we join the real tables directly (proven reliable, like the FIFO query).
    const em = this.orderItemRepository.manager;
    const salesHistorySql = `
      SELECT o.created_at AS createdat,
             o.order_number AS ordernumber,
             oi.quantity AS quantity,
             oi.unit_price AS unitprice,
             oi.total_price AS totalprice,
             u.name AS uomname,
             b.name AS branchname
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      LEFT JOIN branches b ON b.id = o.branch_id
      LEFT JOIN uoms u ON u.id = oi.uom_id
      WHERE oi.inventory_item_id = $1
      ORDER BY o.created_at DESC
      LIMIT 100`;
    const inflowHistorySql = `
      SELECT inflow.received_date AS receivedat,
             ii.quantity AS quantity,
             ii.unit_cost AS unitcost,
             ii.total_cost AS totalcost,
             ii.batch_number AS batchnumber,
             ii.expiry_date AS expirydate,
             u.name AS uomname,
             COALESCE(s.name, isup.name) AS suppliername,
             b.name AS branchname
      FROM inventory_inflow_items ii
      LEFT JOIN inventory_inflows inflow ON inflow.id = ii.inflow_id
      LEFT JOIN uoms u ON u.id = ii.uom_id
      LEFT JOIN suppliers s ON s.id = ii.supplier_id
      LEFT JOIN suppliers isup ON isup.id = inflow.supplier_id
      LEFT JOIN branches b ON b.id = ii.branch_id
      WHERE ii.inventory_item_id = $1
      ORDER BY inflow.received_date DESC NULLS LAST
      LIMIT 100`;

    try {
      const [salesData, recentSales, salesByBranch, salesRows, inflowRows] =
        await Promise.all([
          salesQuery.getRawOne(),
          recentSalesQuery.getRawOne(),
          salesByBranchQuery.getRawMany(),
          em.query(salesHistorySql, [id]),
          em.query(inflowHistorySql, [id]),
        ]);

      const salesHistory = (salesRows || []).map((r: any) => ({
        createdAt: r.createdat,
        quantity: Number(r.quantity || 0),
        uom: { name: r.uomname || null },
        unitPrice: Number(r.unitprice || 0),
        totalPrice: Number(r.totalprice || 0),
        branch: { name: r.branchname || null },
        order: { orderNumber: r.ordernumber || null },
      }));

      const inflowHistory = (inflowRows || []).map((r: any) => {
        const qty = Number(r.quantity || 0);
        const unit = Number(r.unitcost || 0);
        return {
          receivedAt: r.receivedat,
          quantity: qty,
          uom: { name: r.uomname || null },
          costPerUnit: unit,
          totalCost: Number(r.totalcost || 0) || unit * qty,
          batchNumber: r.batchnumber || null,
          expiryDate: r.expirydate || null,
          supplier: { name: r.suppliername || null },
          branch: { name: r.branchname || null },
        };
      });

      const totalSalesAmount = Number(salesData?.totalsalesamount || 0);
      const totalCost = Number(salesData?.totalcost || 0);
      const totalProfit = totalSalesAmount - totalCost;
      const profitMargin =
        totalSalesAmount > 0 ? (totalProfit / totalSalesAmount) * 100 : 0;

      const sales = {
        orderCount: Number(salesData?.ordercount || 0),
        totalQuantitySold: Number(salesData?.totalquantitysold || 0),
        totalSalesAmount,
        totalCost,
        totalProfit,
        profitMargin,
      };

      const recent30Days = {
        recentQuantity: Number(recentSales?.recentquantity || 0),
        recentAmount: Number(recentSales?.recentamount || 0),
      };

      return {
        item,
        branchStocks: branchStocks.map((bs) => ({
          branchId: bs.branchId,
          branchName: resolveBranchName(bs),
          currentStock: Number(bs.currentStock || 0),
          minimumStock: Number(bs.minimumStock || 0),
          maximumStock: Number(bs.maximumStock || 0),
          salePrice: Number(bs.salePrice || 0),
        })),
        sales: {
          orderCount: sales.orderCount,
          totalQuantity: sales.totalQuantitySold,
          totalAmount: sales.totalSalesAmount,
          totalCost: sales.totalCost,
          totalProfit: sales.totalProfit,
          profitMargin: sales.profitMargin,
          recent30Days: {
            quantity: recent30Days.recentQuantity,
            amount: recent30Days.recentAmount,
          },
        },
        salesByBranch: salesByBranch.map((branch: any) => ({
          branchId: branch.branchid,
          branchName: branch.branchname,
          orderCount: Number(branch.ordercount || 0),
          totalQuantity: Number(branch.totalquantity || 0),
          totalAmount: Number(branch.totalamount || 0),
          totalCost: Number(branch.totalcost || 0),
          totalProfit:
            Number(branch.totalamount || 0) - Number(branch.totalcost || 0),
        })),
        inflowHistory,
        salesHistory,
      };
    } catch (error) {
      console.error("Error getting item stats:", error);
      // Return default stats if query fails
      return {
        item,
        branchStocks: branchStocks.map((bs) => ({
          branchId: bs.branchId,
          branchName: resolveBranchName(bs),
          currentStock: Number(bs.currentStock || 0),
          minimumStock: Number(bs.minimumStock || 0),
          maximumStock: Number(bs.maximumStock || 0),
          salePrice: Number(bs.salePrice || 0),
        })),
        sales: {
          orderCount: 0,
          totalQuantity: 0,
          totalAmount: 0,
          totalCost: 0,
          totalProfit: 0,
          profitMargin: 0,
          recent30Days: {
            quantity: 0,
            amount: 0,
          },
        },
        salesByBranch: [],
        inflowHistory: [],
        salesHistory: [],
      };
    }
  }

  async update(
    id: string,

    updateDto: UpdateInventoryItemDto,
    actor?: { id?: string; name?: string },
  ) {
    await this.findOne(id);

    // Base UOM can't change. Components (make-up) are handled separately below.
    // unitCost IS allowed now — it doubles as the manual cost price for untracked
    // / composed items (real COGS for tracked items still comes from inflow).
    const { baseUomId, components, ...updateData } = updateDto as any;
    if (baseUomId) {
      throw new NotFoundException("Base UOM cannot be changed");
    }

    // Validate category if provided
    if (updateData.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateData.categoryId },
      });
      if (!category) {
        throw new NotFoundException("Category not found");
      }
    }

    // Validate subcategory if provided
    if (updateData.subcategoryId) {
      const subcategory = await this.subcategoryRepository.findOne({
        where: { id: updateData.subcategoryId },
      });
      if (!subcategory) {
        throw new NotFoundException("Subcategory not found");
      }
      // Ensure subcategory belongs to the selected category
      const categoryId =
        updateData.categoryId ||
        (await this.inventoryItemRepository.findOne({ where: { id } }))
          ?.categoryId;
      if (categoryId && subcategory.categoryId !== categoryId) {
        throw new NotFoundException(
          "Subcategory does not belong to the selected category",
        );
      }
    }

    if (actor?.id) {
      updateData.updatedBy = actor.id;
      updateData.updatedByName = actor.name || null;
    }
    if (Object.keys(updateData).length > 0) {
      await this.inventoryItemRepository.update({ id }, updateData);
    }
    // Replace the make-up when the caller sent a components array (empty clears).
    if (components !== undefined) {
      await this.setItemComponents(id, components || []);
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.inventoryItemRepository.delete({ id });
  }

  async getLowStockItems(branchId?: string) {
    const items = await this.findAll(branchId);

    return items.filter((item: any) => {
      if (branchId && item.branchStock) {
        const current = parseFloat(String(item.branchStock.currentStock || 0));
        const minimum = parseFloat(String(item.branchStock.minimumStock || 0));
        return current <= minimum;
      }
      const current = parseFloat(String(item.currentStock || 0));
      const minimum = parseFloat(String(item.minimumStock || 0));
      return current <= minimum;
    });
  }

  async generateTemplate(): Promise<string> {
    // Template with image support: Name, Category, Subcategory, UOM, Track Stock, Minimum Stock, Maximum Stock, Sales Price, Barcode, Image Link
    const headers = [
      "Name",
      "Category",
      "Subcategory",
      "UOM",
      "Track Stock",
      "Minimum Stock",
      "Maximum Stock",
      "Sales Price",
      "Barcode",
      "Image Link",
    ];
    return headers.join(",") + "\n";
  }

  async bulkUpload(
    csv: string,
  ): Promise<{ 
    success: number; 
    errors: string[]; 
    skipped: number;
    detailedErrors?: Array<{
      line: number;
      data: string;
      errors: string[];
    }>;
    summary?: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
      skipped: number;
    };
  }> {
    // Remove BOM if present
    let csvContent = csv;
    if (csvContent.charCodeAt(0) === 0xfeff) {
      csvContent = csvContent.slice(1);
    }

    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) {
      return {
        success: 0,
        errors: ["CSV file must have at least a header row and one data row"],
        skipped: 0,
      };
    }

    // Remove header row
    const header = lines[0];
    const dataRows = lines.slice(1);

    const errors: string[] = [];
    const detailedErrors: Array<{
      line: number;
      data: string;
      errors: string[];
    }> = [];
    let success = 0;
    let skipped = 0;
    let duplicateCount = 0;

    // Parse CSV properly (handle quoted values)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    for (let i = 0; i < dataRows.length; i++) {
      const lineNumber = i + 2; // +2 because header is row 1 and arrays are 0-indexed
      const row = parseCSVLine(dataRows[i]);

      // Skip empty rows
      if (row.every((cell) => !cell || cell.trim() === "")) {
        skipped++;
        continue;
      }

      // Validate minimum columns: Name, Category, Subcategory, Unit, Track Stock, Min Stock, Max Stock, Sales Price (at least 7)
      if (row.length < 7) {
        const errorMessage = `Insufficient columns. Expected at least 7 columns (Name, Category, Subcategory, Unit, Track Stock, Minimum Stock, Maximum Stock, Sales Price).`;
        errors.push(`Line ${lineNumber}: ${errorMessage}`);
        detailedErrors.push({
          line: lineNumber,
          data: dataRows[i],
          errors: [errorMessage]
        });
        continue;
      }

      // Map CSV columns with image support:
      // 0: Name, 1: Category, 2: Subcategory, 3: UOM, 4: Track Stock, 5: Minimum Stock, 6: Maximum Stock, 7: Sales Price, 8: Barcode, 9: Image Link
      const trackStockValue = (row[4] || "yes").toLowerCase().trim();
      const isTrackable = ["yes", "y", "1", "true", "on"].includes(
        trackStockValue,
      );

      const itemData: any = {
        name: (row[0] || "").trim(),
        category: (row[1] || "").trim(),
        subcategory: (row[2] || "").trim() || undefined,
        unit: (row[3] || "").trim(), // Unit/UOM name
        isTrackable,
        minimumStock: isTrackable ? parseFloat(row[5] || "0") || 0 : 0,
        maximumStock:
          isTrackable && row[6] ? parseFloat(row[6]) || undefined : undefined,
        salePrice: parseFloat(row[7] || "0") || 0,
        barcode: (row[8] || "").trim() || undefined,
        imageLink: (row[9] || "").trim() || undefined, // New image link field
        currentStock: 0, // Always start at 0
        unitCost: 0, // Cost is captured during inflow
      };

      // Validate required fields
      const currentRowErrors: string[] = [];
      
      if (!itemData.name) {
        currentRowErrors.push("Name is required");
      }

      if (!itemData.unit) {
        currentRowErrors.push("Unit (UOM) is required");
      }

      if (!itemData.salePrice || itemData.salePrice < 0) {
        currentRowErrors.push("Sales Price must be a valid number >= 0");
      }

      if (currentRowErrors.length > 0) {
        const errorMessage = currentRowErrors.join(", ");
        errors.push(`Line ${lineNumber}: ${errorMessage}. Skipping.`);
        detailedErrors.push({
          line: lineNumber,
          data: dataRows[i],
          errors: currentRowErrors
        });
        continue;
      }

      // Check for duplicate by name (case-insensitive)
      const existingItem = await this.inventoryItemRepository.findOne({
        where: {
          name: itemData.name,
        },
      });

      if (existingItem) {
        duplicateCount++;
        const errorMessage = `Item '${itemData.name}' already exists`;
        errors.push(`Line ${lineNumber}: ${errorMessage}. Skipping.`);
        detailedErrors.push({
          line: lineNumber,
          data: dataRows[i],
          errors: [errorMessage]
        });
        continue;
      }

      // Check for duplicate barcode if provided
      if (itemData.barcode) {
        const existingBarcode = await this.inventoryItemRepository.findOne({
          where: {
            barcode: itemData.barcode,
          },
        });

        if (existingBarcode) {
          duplicateCount++;
          const errorMessage = `Barcode '${itemData.barcode}' already exists`;
          errors.push(`Line ${lineNumber}: ${errorMessage}. Skipping.`);
          detailedErrors.push({
            line: lineNumber,
            data: dataRows[i],
            errors: [errorMessage]
          });
          continue;
        }
      }

      // Find or create UOM for the unit
      let uom = await this.uomRepository.findOne({
        where: {
          name: itemData.unit,
        },
      });

      if (!uom) {
        // Try case-insensitive search
        const allUoms = await this.uomRepository.find({});
        uom = allUoms.find(
          (u) => u.name.toLowerCase() === itemData.unit.toLowerCase(),
        );

        if (!uom) {
          // Create UOM if it doesn't exist
          try {
            uom = this.uomRepository.create({
              name: itemData.unit,
              abbreviation: itemData.unit.substring(0, 3).toUpperCase(),
              isDefault: false,
            });
            uom = await this.uomRepository.save(uom);
          } catch (uomError) {
            const errorMessage = `Failed to create UOM '${itemData.unit}'`;
            errors.push(`Line ${lineNumber}: ${errorMessage}. Skipping item.`);
            detailedErrors.push({
              line: lineNumber,
              data: dataRows[i],
              errors: [errorMessage]
            });
            continue;
          }
        }
      }

      // Find or create category by name
      let categoryId: string | undefined;
      if (itemData.category && itemData.category.trim()) {
        let category = await this.categoryRepository.findOne({
          where: { name: itemData.category.trim() },
        });

        // Try case-insensitive search if not found
        if (!category) {
          const allCategories = await this.categoryRepository.find({});
          category = allCategories.find(
            (c) =>
              c.name.toLowerCase() === itemData.category.trim().toLowerCase(),
          );
        }

        // Auto-create category if it doesn't exist
        if (!category) {
          try {
            category = this.categoryRepository.create({
              name: itemData.category.trim(),
              description: null,
            });
            category = await this.categoryRepository.save(category);
          } catch (categoryError: any) {
            const errorMessage = `Failed to create category '${itemData.category}': ${categoryError.message || "Unknown error"}`;
            errors.push(`Line ${lineNumber}: ${errorMessage}`);
            detailedErrors.push({
              line: lineNumber,
              data: dataRows[i],
              errors: [errorMessage]
            });
            continue;
          }
        }
        categoryId = category.id;
      }

      // Find or create subcategory by name (must belong to the category)
      let subcategoryId: string | undefined;
      if (itemData.subcategory && itemData.subcategory.trim()) {
        if (!categoryId) {
          const errorMessage = `Subcategory '${itemData.subcategory}' specified but no category provided`;
          errors.push(`Line ${lineNumber}: ${errorMessage}. Skipping item.`);
          detailedErrors.push({
            line: lineNumber,
            data: dataRows[i],
            errors: [errorMessage]
          });
          continue;
        }

        let subcategory = await this.subcategoryRepository.findOne({
          where: { categoryId, name: itemData.subcategory.trim() },
        });

        // Try case-insensitive search if not found
        if (!subcategory) {
          const allSubcategories = await this.subcategoryRepository.find({
            where: { categoryId },
          });
          subcategory = allSubcategories.find(
            (s) =>
              s.name.toLowerCase() ===
              itemData.subcategory.trim().toLowerCase(),
          );
        }

        // Auto-create subcategory if it doesn't exist
        if (!subcategory) {
          try {
            subcategory = this.subcategoryRepository.create({
              name: itemData.subcategory.trim(),
              description: null,
              categoryId,
            });
            subcategory = await this.subcategoryRepository.save(subcategory);
          } catch (subcategoryError: any) {
            const errorMessage = `Failed to create subcategory '${itemData.subcategory}' under category '${itemData.category}': ${subcategoryError.message || "Unknown error"}`;
            errors.push(`Line ${lineNumber}: ${errorMessage}`);
            detailedErrors.push({
              line: lineNumber,
              data: dataRows[i],
              errors: [errorMessage]
            });
            continue;
          }
        }
        subcategoryId = subcategory.id;
      }

      // Create inventory item
      try {
        const createDto: CreateInventoryItemDto = {
          name: itemData.name,
          categoryId,
          subcategoryId,
          baseUomId: uom.id,
          currentStock: 0,
          minimumStock: itemData.minimumStock,
          maximumStock: itemData.maximumStock || 0,
          unitCost: 0,
          salePrice: itemData.salePrice,
          barcode: itemData.barcode,
          isTrackable: itemData.isTrackable,
        };

        const createdItem = await this.create(createDto);
        
        // Process image if provided
        if (itemData.imageLink && createdItem && createdItem.id) {
          try {
            const imageUrl = await this.processItemImage(itemData.imageLink, createdItem.id, itemData.name);
            if (imageUrl) {
              // Update the item with the processed image URL
              await this.inventoryItemRepository.update(createdItem.id, { frontImage: imageUrl });
              console.log(`[BulkUpload] Successfully processed image for item: ${itemData.name}`);
            }
          } catch (imageError: any) {
            console.warn(`[BulkUpload] Failed to process image for item ${itemData.name}:`, imageError.message);
            // Fallback: persist the original image URL directly so the item still
            // shows an image even when local download/resize fails. Only accept
            // http(s) URLs (the frontend can render an absolute URL as-is).
            const rawLink = String(itemData.imageLink).trim();
            if (/^https?:\/\//i.test(rawLink)) {
              try {
                await this.inventoryItemRepository.update(createdItem.id, { frontImage: rawLink });
                console.log(`[BulkUpload] Persisted original image URL for item: ${itemData.name}`);
              } catch (updateError: any) {
                console.warn(`[BulkUpload] Failed to persist fallback image URL for item ${itemData.name}:`, updateError.message);
              }
            }
            // Don't fail the entire import if image processing fails
          }
        }
        
        success++;
      } catch (error: any) {
        const errorMessage = `Failed to create item - ${error.message || "Unknown error"}`;
        errors.push(`Line ${lineNumber}: ${errorMessage}`);
        detailedErrors.push({
          line: lineNumber,
          data: dataRows[i],
          errors: [errorMessage]
        });
      }
    }

    const total = dataRows.length;
    const failed = detailedErrors.length;

    return { 
      success, 
      errors, 
      skipped,
      detailedErrors,
      summary: {
        total,
        processed: total - skipped,
        successful: success,
        failed,
        skipped
      }
    };
  }

  async findForOrders(branchId?: string) {
    // Use query builder to ensure branches relation is loaded correctly
    // Don't filter branches in WHERE clause - load all and filter in code
    const queryBuilder = this.inventoryItemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.baseUom", "baseUom")
      .leftJoinAndSelect("item.branches", "branches")
      .leftJoinAndSelect("item.category", "category")
      .leftJoinAndSelect("item.subcategory", "subcategory")
      .orderBy("item.name", "ASC");

    let items = await queryBuilder.getMany();

    // Manually load baseUoms if relation didn't load (fallback)
    const baseUomIds = items
      .filter((item) => item.baseUomId)
      .map((item) => item.baseUomId);
    let baseUomsMap = new Map<string, Uom>();
    if (baseUomIds.length > 0) {
      const uniqueBaseUomIds = [...new Set(baseUomIds)];
      const loadedBaseUoms = await this.uomRepository.find({
        where: { id: In(uniqueBaseUomIds) },
      });
      loadedBaseUoms.forEach((uom) => {
        baseUomsMap.set(uom.id, uom);
      });
    }

    // If branchId is specified, manually load branch inventory for better reliability
    if (branchId && items.length > 0) {
      const itemIds = items.map((item) => item.id);

      // Load all branch inventory items for these items and this branch
      const branchInventoryItems = await this.branchInventoryRepository.find({
        where: {
          branchId,
          inventoryItemId: In(itemIds),
        },
      });

      // Create a map for quick lookup
      const branchInventoryMap = new Map<string, BranchInventoryItem>();
      branchInventoryItems.forEach((bi) => {
        branchInventoryMap.set(bi.inventoryItemId, bi);
      });

      // Manually attach branch inventory to items
      items = items.map((item) => {
        const branchInventory = branchInventoryMap.get(item.id);
        if (branchInventory) {
          // Replace or add to branches array
          if (!item.branches) {
            item.branches = [];
          }
          // Remove existing branch inventory for this branch if any
          item.branches = item.branches.filter((b) => b.branchId !== branchId);
          // Add the branch inventory
          item.branches.push(branchInventory);
        }
        // Also ensure baseUom is loaded from map if relation didn't load
        if (
          !item.baseUom &&
          item.baseUomId &&
          baseUomsMap.has(item.baseUomId)
        ) {
          item.baseUom = baseUomsMap.get(item.baseUomId);
        }
        return item;
      });
    } else {
      // Ensure baseUom is loaded from map if relation didn't load (even without branchId)
      items = items.map((item) => {
        if (
          !item.baseUom &&
          item.baseUomId &&
          baseUomsMap.has(item.baseUomId)
        ) {
          item.baseUom = baseUomsMap.get(item.baseUomId);
        }
        return item;
      });
    }

    // Get all UOM conversions for this business
    const conversions = await this.uomConversionsService.findAll();
    const conversionMap = new Map<string, number>();
    conversions.forEach((conv) => {
      conversionMap.set(
        `${conv.fromUomId}-${conv.toUomId}`,
        Number(conv.factor),
      );
    });

    // Make-up + availability precompute. Composed items have no own stock — how
    // many can be sold is bounded by the limiting TRACKABLE component. Untracked
    // items (and untracked components) never block.
    const allComponents = await this.componentRepository.find();
    const componentsByParent = new Map<string, InventoryItemComponent[]>();
    for (const c of allComponents) {
      const list = componentsByParent.get(c.parentItemId) || [];
      list.push(c);
      componentsByParent.set(c.parentItemId, list);
    }
    const itemById = new Map(items.map((i) => [i.id, i]));
    const UNLIMITED = 1_000_000;
    const branchStockOf = (it: any): number => {
      if (branchId) {
        const bs = it.branches?.find((b: any) => b.branchId === branchId);
        return bs ? Number(bs.currentStock || 0) : 0;
      }
      return Number(it.currentStock || 0);
    };
    const makeableOf = (item: any): number => {
      const comps = componentsByParent.get(item.id);
      if (comps && comps.length > 0) {
        let min = Infinity;
        for (const c of comps) {
          const ci = itemById.get(c.componentItemId);
          if (!ci) return 0;
          if (ci.isTrackable === false) continue; // untracked never blocks
          let perBase = Number(c.quantity) || 0;
          if (c.uomId && c.uomId !== ci.baseUomId) {
            const f = conversionMap.get(`${c.uomId}-${ci.baseUomId}`);
            if (f && f > 0) perBase = Number(c.quantity) * f;
          }
          if (perBase <= 0) continue;
          min = Math.min(min, Math.floor(branchStockOf(ci) / perBase));
        }
        return min === Infinity ? UNLIMITED : min; // all-untracked ⇒ unlimited
      }
      if (item.isTrackable === false) return UNLIMITED;
      return branchStockOf(item);
    };

    return items
      .filter((item) => {
        // Only items offered for sale (ingredients are hidden) that can be made.
        if (item.sellAtPos === false) return false;
        return makeableOf(item) > 0;
      })
      .map((item) => {
        // Availability: makeable count (limiting component) / own stock / unlimited.
        const avail = makeableOf(item);
        const unlimited = avail >= UNLIMITED; // untracked item / all-untracked make-up
        const stock = avail;

        // Also get sale price from branch inventory if available, otherwise use global
        let price = Number(item.salePrice || 0);
        if (branchId) {
          const branchStock = item.branches?.find(
            (b) => b.branchId === branchId,
          );
          if (branchStock && branchStock.salePrice) {
            price = Number(branchStock.salePrice || 0);
          }
          // If no branch price, use global price (already set above)
        }

        const baseUomId = item.baseUomId;

        // Use manually loaded baseUom if relation didn't load
        const baseUom =
          item.baseUom || (baseUomId ? baseUomsMap.get(baseUomId) : null);

        // Build UOM list - start with base UOM
        const uoms = [
          {
            id: baseUom?.id || baseUomId,
            name: baseUom?.name || "Unknown",
            abbreviation: baseUom?.abbreviation || "",
          },
        ];

        // Build UOM to base conversion map
        const uomToBase: Record<string, number> = {};
        const uomPrices: Record<string, number> = {};

        // Base UOM always has multiplier of 1
        uomToBase[baseUomId] = 1;
        uomPrices[baseUomId] = price;

        // Find all UOMs that can convert to base UOM
        conversions.forEach((conv) => {
          if (!conv.fromUom || !conv.toUom) {
            // Skip conversions with missing UOM data
            return;
          }

          if (conv.toUomId === baseUomId) {
            // This UOM can convert to base
            const multiplier = Number(conv.factor);
            uomToBase[conv.fromUomId] = multiplier;
            uomPrices[conv.fromUomId] = price * multiplier;

            // Add UOM to list if not already there
            if (!uoms.find((u) => u.id === conv.fromUom.id)) {
              uoms.push({
                id: conv.fromUom.id,
                name: conv.fromUom.name || "Unknown",
                abbreviation: conv.fromUom.abbreviation || "",
              });
            }
          } else if (conv.fromUomId === baseUomId) {
            // Base can convert to this UOM
            const multiplier = 1 / Number(conv.factor);
            uomToBase[conv.toUomId] = multiplier;
            uomPrices[conv.toUomId] = price * multiplier;

            if (!uoms.find((u) => u.id === conv.toUom.id)) {
              uoms.push({
                id: conv.toUom.id,
                name: conv.toUom.name || "Unknown",
                abbreviation: conv.toUom.abbreviation || "",
              });
            }
          }
        });

        // Use manually loaded baseUom for unit name
        const unitName = baseUom?.name || "Unknown";

        return {
          id: item.id,
          name: item.name,
          category: item.category?.name || null,
          subcategory: item.subcategory?.name || null,
          price,
          stock,
          unlimited,
          unit: unitName,
          defaultUomId: baseUomId,
          baseUomId,
          uoms,
          uomToBase,
          uomPrices,
        };
      });
  }

  /**
   * Ingredient picker options for the dish/recipe editor: EVERY item (no stock
   * filter — you define a recipe even when out of stock), each with its
   * convertible UoMs (factor to base) and a cost-per-base-unit. The cost is the
   * quantity-weighted average of the item's inflow batches (fallback: the item's
   * unitCost). Lets the editor compute food cost live as you build the recipe.
   */
  async getIngredientOptions() {
    const all = await this.inventoryItemRepository.find({ relations: ["baseUom"] });
    if (!all.length) return [];

    // v1: ingredients must be RAW items (no nested make-up). Exclude any item
    // that itself has components.
    const composed = await this.componentRepository.find();
    const composedIds = new Set(composed.map((c) => c.parentItemId));
    const items = all.filter((i) => !composedIds.has(i.id));
    if (!items.length) return [];

    const [conversions, allUoms] = await Promise.all([
      this.uomConversionsService.findAll(),
      this.uomRepository.find({}),
    ]);
    const uomById = new Map(allUoms.map((u) => [u.id, u]));

    // Weighted-average cost per item from its inflow batches.
    const costRows: Array<{ itemId: string; value: string; qty: string }> =
      await this.inventoryItemRepository.query(
        `SELECT inventory_item_id AS "itemId",
                SUM(base_quantity * unit_cost) AS "value",
                SUM(base_quantity) AS "qty"
         FROM inventory_inflow_items
         GROUP BY inventory_item_id`,
      );
    const costByItem = new Map<string, number>();
    costRows.forEach((r) => {
      const qty = Number(r.qty) || 0;
      const value = Number(r.value) || 0;
      if (qty > 0) costByItem.set(r.itemId, value / qty);
    });

    return items
      .filter((item) => item.baseUomId)
      .map((item) => {
        const baseUomId = item.baseUomId;
        const baseUom = item.baseUom || uomById.get(baseUomId);
        const uoms: Array<{
          id: string;
          name: string;
          abbreviation: string;
          factorToBase: number;
        }> = [
          {
            id: baseUomId,
            name: baseUom?.name || "Unit",
            abbreviation: baseUom?.abbreviation || "",
            factorToBase: 1,
          },
        ];

        conversions.forEach((conv) => {
          if (conv.toUomId === baseUomId && conv.fromUomId) {
            if (!uoms.find((u) => u.id === conv.fromUomId)) {
              const u = uomById.get(conv.fromUomId);
              uoms.push({
                id: conv.fromUomId,
                name: u?.name || "Unit",
                abbreviation: u?.abbreviation || "",
                factorToBase: Number(conv.factor),
              });
            }
          } else if (conv.fromUomId === baseUomId && conv.toUomId) {
            if (!uoms.find((u) => u.id === conv.toUomId)) {
              const u = uomById.get(conv.toUomId);
              uoms.push({
                id: conv.toUomId,
                name: u?.name || "Unit",
                abbreviation: u?.abbreviation || "",
                factorToBase: 1 / Number(conv.factor),
              });
            }
          }
        });

        return {
          id: item.id,
          name: item.name,
          baseUomId,
          baseUomName: baseUom?.name || "Unit",
          costPerBaseUnit: costByItem.get(item.id) ?? (Number(item.unitCost) || 0),
          uoms,
        };
      });
  }

  /**
   * Process and store image from URL for inventory item
   */
  private async processItemImage(imageUrl: string, itemId: string, itemName: string): Promise<string | null> {
    try {
      console.log(`[ImageProcessing] Processing image for item: ${itemName}`);
      
      // Download image from URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // Generate unique filename
      const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
      const fileExtension = this.getImageExtension(response.headers.get('content-type') || 'image/jpeg');
      const fileName = `${itemId}_${imageHash}${fileExtension}`;
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'inventory');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filePath = path.join(uploadsDir, fileName);
      
      // Resize and optimize image using Sharp
      await sharp(imageBuffer)
        .resize(800, 600, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85 })
        .toFile(filePath);
      
      // Return the relative path for storage in database
      const relativePath = `/uploads/inventory/${fileName}`;
      console.log(`[ImageProcessing] Successfully processed image: ${relativePath}`);
      
      return relativePath;
    } catch (error: any) {
      console.error(`[ImageProcessing] Error processing image for ${itemName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get file extension based on content type
   */
  private getImageExtension(contentType: string): string {
    switch (contentType.toLowerCase()) {
      case 'image/png':
        return '.png';
      case 'image/gif':
        return '.gif';
      case 'image/webp':
        return '.webp';
      case 'image/jpeg':
      case 'image/jpg':
      default:
        return '.jpg';
    }
  }
}
