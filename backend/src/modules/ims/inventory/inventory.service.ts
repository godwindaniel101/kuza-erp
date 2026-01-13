import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { InventoryItem } from "../entities/inventory-item.entity";
import { BranchInventoryItem } from "../entities/branch-inventory-item.entity";
import { CreateInventoryItemDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";
import { UomConversionsService } from "../uom-conversions/uom-conversions.service";
import { Uom } from "../entities/uom.entity";
import { Branch } from "../../../common/entities/branch.entity";
import { InventoryCategory } from "../entities/inventory-category.entity";
import { InventorySubcategory } from "../entities/inventory-subcategory.entity";
import { OrderItem } from "../../rms/entities/order-item.entity";
import { Order } from "../../rms/entities/order.entity";

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
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
    private uomConversionsService: UomConversionsService
  ) {}

  async create(businessId: string, createDto: CreateInventoryItemDto) {
    // Validate category if provided
    if (createDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: createDto.categoryId, businessId },
      });
      if (!category) {
        throw new NotFoundException("Category not found");
      }
    }

    // Validate subcategory if provided
    if (createDto.subcategoryId) {
      const subcategory = await this.subcategoryRepository.findOne({
        where: { id: createDto.subcategoryId, businessId },
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
          "Subcategory does not belong to the selected category"
        );
      }
    }

    const item = this.inventoryItemRepository.create({
      ...createDto,
      unitCost: 0, // Cost is captured during inflow, not when creating items
      businessId,
    });
    return this.inventoryItemRepository.save(item);
  }

  async findAll(businessId: string, branchId?: string) {
    const items = await this.inventoryItemRepository.find({
      where: { businessId },
      relations: [
        "baseUom",
        "branches",
        "branches.branch",
        "category",
        "subcategory",
      ],
    });

    // Guard: return early if no items
    if (!items || items.length === 0) {
      return [];
    }

    // Get all UOM conversions and all UOMs for this restaurant
    const [conversions, allUoms] = await Promise.all([
      this.uomConversionsService.findAll(businessId),
      this.uomRepository.find({ where: { businessId } }),
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

    // Manually load baseUoms with businessId constraint (use already loaded allUomsMap as fallback)
    const baseUomsMap = new Map<string, Uom>();
    if (baseUomIds.length > 0) {
      const baseUoms = await this.uomRepository.find({
        where: {
          businessId,
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

    // Manually load categories and subcategories with businessId constraint
    const categoriesMap = new Map<string, InventoryCategory>();
    if (categoryIds.length > 0) {
      const categories = await this.categoryRepository.find({
        where: {
          businessId,
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
          businessId,
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

        // Use manually loaded category/subcategory if relation didn't load
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

    return itemsWithUoms;
  }

  async findAllWithBranchStock(businessId: string) {
    // Use query builder to ensure all relations load correctly
    const items = await this.inventoryItemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.baseUom", "baseUom")
      .leftJoinAndSelect("item.branches", "branches")
      .leftJoinAndSelect("item.category", "category")
      .leftJoinAndSelect("item.subcategory", "subcategory")
      .where("item.businessId = :businessId", { businessId })
      .orderBy("item.name", "ASC")
      .getMany();

    // Get all branches for this restaurant
    const branches = await this.branchRepository.find({
      where: { businessId },
      order: { isDefault: "DESC", name: "ASC" },
    });

    // Load all baseUoms in batch if any are missing
    const baseUomIds = items.map((item) => item.baseUomId).filter(Boolean);
    const baseUomsMap = new Map<string, Uom>();
    if (baseUomIds.length > 0) {
      const baseUoms = await this.uomRepository.find({
        where: { businessId, id: In(baseUomIds) },
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
        where: { businessId, id: In(categoryIds) },
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
        where: { businessId, id: In(subcategoryIds) },
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

    return items
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
          branchStocks,
          totalStock,
          minimumStock: Number(item.minimumStock || 0),
          maximumStock: Number(item.maximumStock || 0),
          salePrice: Number(item.salePrice || 0),
        };
      })
      .filter((item) => item !== null); // Filter out any null items
  }

  async findOne(id: string, businessId: string) {
    const item = await this.inventoryItemRepository.findOne({
      where: { id, businessId },
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

    return {
      ...item,
      category: item.category?.name || null,
      subcategory: item.subcategory?.name || null,
    };
  }

  async getItemStats(id: string, businessId: string) {
    // Get the item with basic info
    const item = await this.findOne(id, businessId);

    // Get branch stocks
    const branchStocks = await this.branchInventoryRepository.find({
      where: { inventoryItemId: id },
      relations: ["branch"],
    });

    // Get sales data from order items (include all orders, not just completed ones)
    const orderItemsQuery = `
      SELECT 
        oi.inventoryItemId,
        COUNT(DISTINCT oi.orderId) as orderCount,
        SUM(oi.quantityBase) as totalQuantitySold,
        SUM(oi.totalPrice) as totalSalesAmount,
        SUM(oi.costTotal) as totalCost,
        SUM(oi.totalPrice - oi.costTotal) as totalProfit,
        CASE 
          WHEN SUM(oi.totalPrice) > 0 
          THEN ((SUM(oi.totalPrice - oi.costTotal) / SUM(oi.totalPrice)) * 100)
          ELSE 0 
        END as profitMargin
      FROM order_items oi
      INNER JOIN orders o ON oi.orderId = o.id
      WHERE oi.inventoryItemId = $1 
        AND o.businessId = $2
      GROUP BY oi.inventoryItemId
    `;

    const recentSalesQuery = `
      SELECT 
        SUM(oi.quantityBase) as recentQuantity,
        SUM(oi.totalPrice) as recentAmount
      FROM order_items oi
      INNER JOIN orders o ON oi.orderId = o.id
      WHERE oi.inventoryItemId = $1 
        AND o.businessId = $2
        AND o.createdAt >= NOW() - INTERVAL '30 days'
    `;

    const salesByBranchQuery = `
      SELECT 
        o.branchId,
        b.name as branchName,
        COUNT(DISTINCT oi.orderId) as orderCount,
        SUM(oi.quantityBase) as totalQuantity,
        SUM(oi.totalPrice) as totalAmount,
        SUM(oi.costTotal) as totalCost,
        SUM(oi.totalPrice - oi.costTotal) as totalProfit
      FROM order_items oi
      INNER JOIN orders o ON oi.orderId = o.id
      INNER JOIN branches b ON o.branchId = b.id
      WHERE oi.inventoryItemId = $1 
        AND o.businessId = $2
      GROUP BY o.branchId, b.name
      ORDER BY totalAmount DESC
    `;

    try {
      const [salesData, recentSales, salesByBranch] = await Promise.all([
        this.inventoryItemRepository.query(orderItemsQuery, [id, businessId]),
        this.inventoryItemRepository.query(recentSalesQuery, [id, businessId]),
        this.inventoryItemRepository.query(salesByBranchQuery, [
          id,
          businessId,
        ]),
      ]);

      const sales = salesData[0] || {
        orderCount: 0,
        totalQuantitySold: 0,
        totalSalesAmount: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
      };

      const recent30Days = recentSales[0] || {
        recentQuantity: 0,
        recentAmount: 0,
      };

      return {
        item,
        branchStocks: branchStocks.map((bs) => ({
          branchId: bs.branchId,
          branchName: bs.branch?.name || "Unknown Branch",
          currentStock: Number(bs.currentStock || 0),
          minimumStock: Number(bs.minimumStock || 0),
          maximumStock: Number(bs.maximumStock || 0),
          salePrice: Number(bs.salePrice || 0),
        })),
        sales: {
          orderCount: Number(sales.ordercount || 0),
          totalQuantity: Number(sales.totalquantitysold || 0),
          totalAmount: Number(sales.totalsalesamount || 0),
          totalCost: Number(sales.totalcost || 0),
          totalProfit: Number(sales.totalprofit || 0),
          profitMargin: Number(sales.profitmargin || 0),
          recent30Days: {
            quantity: Number(recent30Days.recentquantity || 0),
            amount: Number(recent30Days.recentamount || 0),
          },
        },
        salesByBranch: salesByBranch.map((branch: any) => ({
          branchId: branch.branchid,
          branchName: branch.branchname,
          orderCount: Number(branch.ordercount || 0),
          totalQuantity: Number(branch.totalquantity || 0),
          totalAmount: Number(branch.totalamount || 0),
          totalCost: Number(branch.totalcost || 0),
          totalProfit: Number(branch.totalprofit || 0),
        })),
      };
    } catch (error) {
      console.error("Error getting item stats:", error);
      // Return default stats if query fails
      return {
        item,
        branchStocks: branchStocks.map((bs) => ({
          branchId: bs.branchId,
          branchName: bs.branch?.name || "Unknown Branch",
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
      };
    }
  }

  async update(
    id: string,
    businessId: string,
    updateDto: UpdateInventoryItemDto
  ) {
    await this.findOne(id, businessId);

    // Prevent baseUomId and unitCost from being changed
    const { baseUomId, unitCost, ...updateData } = updateDto as any;
    if (baseUomId) {
      throw new NotFoundException("Base UOM cannot be changed");
    }
    // unitCost is removed from updateData - cost is captured during inflow, not when updating items

    // Validate category if provided
    if (updateData.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateData.categoryId, businessId },
      });
      if (!category) {
        throw new NotFoundException("Category not found");
      }
    }

    // Validate subcategory if provided
    if (updateData.subcategoryId) {
      const subcategory = await this.subcategoryRepository.findOne({
        where: { id: updateData.subcategoryId, businessId },
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
          "Subcategory does not belong to the selected category"
        );
      }
    }

    await this.inventoryItemRepository.update({ id }, updateData);
    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.inventoryItemRepository.delete({ id });
  }

  async getLowStockItems(businessId: string, branchId?: string) {
    const items = await this.findAll(businessId, branchId);

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
    // Match Laravel template pattern: Name, Category, Subcategory, Unit, Track Stock, Minimum Stock, Maximum Stock, Sales Price, Barcode
    const headers = [
      "Name",
      "Category",
      "Subcategory",
      "Unit",
      "Track Stock",
      "Minimum Stock",
      "Maximum Stock",
      "Sales Price",
      "Barcode",
    ];
    return headers.join(",") + "\n";
  }

  async bulkUpload(
    businessId: string,
    csv: string
  ): Promise<{ success: number; errors: string[]; skipped: number }> {
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
        errors.push(
          `Line ${lineNumber}: Insufficient columns. Expected at least 7 columns (Name, Category, Subcategory, Unit, Track Stock, Minimum Stock, Maximum Stock, Sales Price).`
        );
        continue;
      }

      // Map CSV columns based on Laravel pattern:
      // 0: Name, 1: Category, 2: Subcategory, 3: Unit, 4: Track Stock, 5: Minimum Stock, 6: Maximum Stock, 7: Sales Price, 8: Barcode
      const trackStockValue = (row[4] || "yes").toLowerCase().trim();
      const isTrackable = ["yes", "y", "1", "true", "on"].includes(
        trackStockValue
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
        currentStock: 0, // Always start at 0
        unitCost: 0, // Cost is captured during inflow
      };

      // Validate required fields
      if (!itemData.name) {
        errors.push(`Line ${lineNumber}: Name is required. Skipping.`);
        continue;
      }

      // Category is now optional (can be null)

      if (!itemData.unit) {
        errors.push(`Line ${lineNumber}: Unit (UOM) is required. Skipping.`);
        continue;
      }

      if (!itemData.salePrice || itemData.salePrice < 0) {
        errors.push(
          `Line ${lineNumber}: Sales Price must be a valid number >= 0. Skipping.`
        );
        continue;
      }

      // Check for duplicate by name (case-insensitive)
      const existingItem = await this.inventoryItemRepository.findOne({
        where: {
          businessId,
          name: itemData.name,
        },
      });

      if (existingItem) {
        duplicateCount++;
        errors.push(
          `Line ${lineNumber}: Item '${itemData.name}' already exists. Skipping.`
        );
        continue;
      }

      // Check for duplicate barcode if provided
      if (itemData.barcode) {
        const existingBarcode = await this.inventoryItemRepository.findOne({
          where: {
            businessId,
            barcode: itemData.barcode,
          },
        });

        if (existingBarcode) {
          duplicateCount++;
          errors.push(
            `Line ${lineNumber}: Barcode '${itemData.barcode}' already exists. Skipping.`
          );
          continue;
        }
      }

      // Find or create UOM for the unit
      let uom = await this.uomRepository.findOne({
        where: {
          businessId,
          name: itemData.unit,
        },
      });

      if (!uom) {
        // Try case-insensitive search
        const allUoms = await this.uomRepository.find({
          where: { businessId },
        });
        uom = allUoms.find(
          (u) => u.name.toLowerCase() === itemData.unit.toLowerCase()
        );

        if (!uom) {
          // Create UOM if it doesn't exist
          try {
            uom = this.uomRepository.create({
              businessId,
              name: itemData.unit,
              abbreviation: itemData.unit.substring(0, 3).toUpperCase(),
              isDefault: false,
            });
            uom = await this.uomRepository.save(uom);
          } catch (uomError) {
            errors.push(
              `Line ${lineNumber}: Failed to create UOM '${itemData.unit}'. Skipping item.`
            );
            continue;
          }
        }
      }

      // Find or create category by name
      let categoryId: string | undefined;
      if (itemData.category && itemData.category.trim()) {
        let category = await this.categoryRepository.findOne({
          where: { businessId, name: itemData.category.trim() },
        });

        // Try case-insensitive search if not found
        if (!category) {
          const allCategories = await this.categoryRepository.find({
            where: { businessId },
          });
          category = allCategories.find(
            (c) =>
              c.name.toLowerCase() === itemData.category.trim().toLowerCase()
          );
        }

        // Auto-create category if it doesn't exist
        if (!category) {
          try {
            category = this.categoryRepository.create({
              name: itemData.category.trim(),
              description: null,
              businessId,
            });
            category = await this.categoryRepository.save(category);
          } catch (categoryError: any) {
            errors.push(
              `Line ${lineNumber}: Failed to create category '${itemData.category}'. ${categoryError.message || "Unknown error"}`
            );
            continue;
          }
        }
        categoryId = category.id;
      }

      // Find or create subcategory by name (must belong to the category)
      let subcategoryId: string | undefined;
      if (itemData.subcategory && itemData.subcategory.trim()) {
        if (!categoryId) {
          errors.push(
            `Line ${lineNumber}: Subcategory '${itemData.subcategory}' specified but no category provided. Skipping item.`
          );
          continue;
        }

        let subcategory = await this.subcategoryRepository.findOne({
          where: { businessId, categoryId, name: itemData.subcategory.trim() },
        });

        // Try case-insensitive search if not found
        if (!subcategory) {
          const allSubcategories = await this.subcategoryRepository.find({
            where: { businessId, categoryId },
          });
          subcategory = allSubcategories.find(
            (s) =>
              s.name.toLowerCase() === itemData.subcategory.trim().toLowerCase()
          );
        }

        // Auto-create subcategory if it doesn't exist
        if (!subcategory) {
          try {
            subcategory = this.subcategoryRepository.create({
              name: itemData.subcategory.trim(),
              description: null,
              categoryId,
              businessId,
            });
            subcategory = await this.subcategoryRepository.save(subcategory);
          } catch (subcategoryError: any) {
            errors.push(
              `Line ${lineNumber}: Failed to create subcategory '${itemData.subcategory}' under category '${itemData.category}'. ${subcategoryError.message || "Unknown error"}`
            );
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

        await this.create(businessId, createDto);
        success++;
      } catch (error: any) {
        errors.push(
          `Line ${lineNumber}: Failed to create item - ${error.message || "Unknown error"}`
        );
      }
    }

    return { success, errors, skipped };
  }

  async findForOrders(businessId: string, branchId?: string) {
    // Use query builder to ensure branches relation is loaded correctly
    // Don't filter branches in WHERE clause - load all and filter in code
    const queryBuilder = this.inventoryItemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.baseUom", "baseUom")
      .leftJoinAndSelect("item.branches", "branches")
      .leftJoinAndSelect("item.category", "category")
      .leftJoinAndSelect("item.subcategory", "subcategory")
      .where("item.businessId = :businessId", { businessId })
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
        where: { businessId, id: In(uniqueBaseUomIds) },
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

    // Get all UOM conversions for this restaurant
    const conversions = await this.uomConversionsService.findAll(businessId);
    const conversionMap = new Map<string, number>();
    conversions.forEach((conv) => {
      conversionMap.set(
        `${conv.fromUomId}-${conv.toUomId}`,
        Number(conv.factor)
      );
    });

    return items
      .filter((item) => {
        // Filter items with stock > 0 if branch is specified
        if (branchId) {
          // ONLY show items that have branch inventory with stock > 0
          // No fallback to global stock - only items with stock in the selected branch
          const branchStock = item.branches?.find(
            (b) => b.branchId === branchId
          );
          if (branchStock) {
            // Item has branch inventory - use branch stock
            const stock = Number(branchStock.currentStock || 0);
            return stock > 0;
          }
          // Item doesn't have branch inventory - don't show it
          return false;
        }
        // No branch specified - use global stock
        return Number(item.currentStock || 0) > 0;
      })
      .map((item) => {
        // Get stock from branch inventory if branchId is specified, otherwise use global stock
        let stock = Number(item.currentStock || 0);
        if (branchId) {
          const branchStock = item.branches?.find(
            (b) => b.branchId === branchId
          );
          if (branchStock) {
            // Use branch stock if branch inventory exists
            stock = Number(branchStock.currentStock || 0);
          }
          // If no branch inventory, stock remains 0 (item filtered out above)
        }

        // Also get sale price from branch inventory if available, otherwise use global
        let price = Number(item.salePrice || 0);
        if (branchId) {
          const branchStock = item.branches?.find(
            (b) => b.branchId === branchId
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
          unit: unitName,
          defaultUomId: baseUomId,
          baseUomId,
          uoms,
          uomToBase,
          uomPrices,
        };
      });
  }
}
