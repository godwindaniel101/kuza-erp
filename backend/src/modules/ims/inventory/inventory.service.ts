import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, DataSource } from "typeorm";
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
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as sharp from "sharp";

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
    private uomConversionsService: UomConversionsService,
    private dataSource: DataSource,
  ) {}

  async create(createDto: CreateInventoryItemDto) {
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

    const item = this.inventoryItemRepository.create({
      ...createDto,
      unitCost: 0, // Cost is captured during inflow, not when creating items
    });
    const savedItem = await this.inventoryItemRepository.save(item);
    
    // Explicitly load the item with relations to ensure they're available immediately
    const itemWithRelations = await this.inventoryItemRepository.findOne({
      where: { id: savedItem.id },
      relations: ["category", "subcategory", "baseUom"],
    });
    
    return itemWithRelations || savedItem;
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

    return itemsWithUoms;
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

    return {
      ...item,
      category: item.category?.name || null,
      subcategory: item.subcategory?.name || null,
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

    try {
      const [salesData, recentSales, salesByBranch] = await Promise.all([
        salesQuery.getRawOne(),
        recentSalesQuery.getRawOne(),
        salesByBranchQuery.getRawMany(),
      ]);

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
          branchName: bs.branch?.name || "Unknown Branch",
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

    updateDto: UpdateInventoryItemDto,
  ) {
    await this.findOne(id);

    // Prevent baseUomId and unitCost from being changed
    const { baseUomId, unitCost, ...updateData } = updateDto as any;
    if (baseUomId) {
      throw new NotFoundException("Base UOM cannot be changed");
    }
    // unitCost is removed from updateData - cost is captured during inflow, not when updating items

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

    await this.inventoryItemRepository.update({ id }, updateData);
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

    return items
      .filter((item) => {
        // Filter items with stock > 0 if branch is specified
        if (branchId) {
          // ONLY show items that have branch inventory with stock > 0
          // No fallback to global stock - only items with stock in the selected branch
          const branchStock = item.branches?.find(
            (b) => b.branchId === branchId,
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
            (b) => b.branchId === branchId,
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
