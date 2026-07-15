import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Branch } from "../../../common/entities/branch.entity";
import { Order } from "../entities/order.entity";
import { OrderItem } from "../entities/order-item.entity";
import { InventoryItem } from "../../ims/entities/inventory-item.entity";
import { BranchInventoryItem } from "../../ims/entities/branch-inventory-item.entity";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(BranchInventoryItem)
    private branchInventoryRepository: Repository<BranchInventoryItem>,
  ) {}

  private getDateRange(period?: string) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case "week":
        // Start of current week (Sunday)
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        break;
      case "month":
        // Start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        // Default to today
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
    }

    return { startDate, endDate };
  }

  async getAnalytics(period?: string) {
    const { startDate, endDate } = this.getDateRange(period);

    // Top Branches with revenue and order count
    const topBranches = await this.branchRepository
      .createQueryBuilder("branch")
      .leftJoin(Order, "order", "order.branchId = branch.id")
      .select("branch.id", "id")
      .addSelect("branch.name", "name")
      .addSelect("COALESCE(SUM(order.totalAmount), 0)", "revenue")
      .addSelect("COUNT(order.id)", "ordersCount")

      .groupBy("branch.id")
      .addGroupBy("branch.name")
      .orderBy("revenue", "DESC")
      .limit(5)
      .getRawMany();

    const bestBranch = topBranches.length > 0 ? topBranches[0] : null;

    // Top Products - Most sold products for the selected period
    const topProductsRaw = await this.orderItemRepository
      .createQueryBuilder("orderItem")
      .select("item.id", "id")
      .addSelect("item.name", "name")
      .addSelect("uom.name", "unit")
      .addSelect("uom.abbreviation", "unitAbbr")
      .addSelect("COALESCE(SUM(orderItem.quantity), 0)", "quantitySold")
      .addSelect("COALESCE(SUM(orderItem.totalPrice), 0)", "revenue")
      .innerJoin("orderItem.inventoryItem", "item")
      .innerJoin("orderItem.order", "order")
      .leftJoin("item.baseUom", "uom")

      .andWhere("order.status != :cancelledStatus", {
        cancelledStatus: "cancelled",
      })
      .andWhere("order.createdAt >= :startDate", { startDate })
      .andWhere("order.createdAt < :endDate", { endDate })
      .groupBy("item.id")
      .addGroupBy("item.name")
      .addGroupBy("uom.name")
      .addGroupBy("uom.abbreviation")
      .orderBy("COALESCE(SUM(orderItem.quantity), 0)", "DESC")
      .limit(5)
      .getRawMany();

    // Map raw results - getRawMany() returns field names as specified in select
    // Handle both camelCase and snake_case field names (TypeORM may return either)
    const topProducts = topProductsRaw.map((p) => {
      // Try both naming conventions
      const id = p.id || p.item_id;
      const name = p.name || p.item_name || "";
      const unit =
        p.unit || p.unitAbbr || p.uom_name || p.uom_abbreviation || "";
      const quantitySold = parseFloat(
        String(p.quantitySold || p.quantity_sold || "0"),
      );
      const revenue = parseFloat(String(p.revenue || "0"));

      return {
        id,
        name,
        unit,
        quantitySold,
        revenue,
      };
    });

    const bestProduct = topProducts.length > 0 ? topProducts[0] : null;

    // Low Stock Items - Check branch-specific inventory
    // Match the logic from branch items page: show items where currentStock <= minimumStock
    // when minimumStock is set and > 0
    const lowStockItemsRaw = await this.branchInventoryRepository
      .createQueryBuilder("bi")
      .innerJoin("bi.inventoryItem", "item")
      .leftJoin("item.baseUom", "uom")
      .leftJoin("bi.branch", "branch")
      .select("item.id", "id")
      .addSelect("item.name", "name")
      .addSelect("bi.currentStock", "currentStock")
      .addSelect("bi.minimumStock", "minimumStock")
      .addSelect("bi.branchId", "branchId")
      .addSelect("branch.name", "branchName")
      .addSelect("uom.name", "unit")
      .addSelect("uom.abbreviation", "unitAbbr")
      .andWhere("item.isTrackable = :isTrackable", { isTrackable: true })
      .andWhere("bi.minimumStock IS NOT NULL")
      .andWhere("CAST(bi.minimumStock AS DECIMAL) > 0")
      .andWhere(
        "CAST(bi.currentStock AS DECIMAL) <= CAST(bi.minimumStock AS DECIMAL)",
      )
      .orderBy("CAST(bi.currentStock AS DECIMAL)", "ASC")
      .addOrderBy("item.name", "ASC")
      .limit(10)
      .getRawMany();

    // Map to the expected format with branch information
    const lowStockItems = lowStockItemsRaw.map((row) => ({
      id: row.id,
      name: row.name || "",
      currentStock: parseFloat(String(row.currentStock || "0")),
      minimumStock: parseFloat(String(row.minimumStock || "0")),
      branchId: row.branchId,
      branchName: row.branchName || "",
      unit: row.unit || row.unitAbbr || "",
    }));

    // Over Stock Items - Use getMany() instead of getRawMany() for proper entity mapping
    const overStockItemsEntities = await this.inventoryItemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.baseUom", "uom")
      .andWhere("item.isTrackable = :isTrackable", { isTrackable: true })
      .andWhere("item.maximumStock IS NOT NULL")
      .andWhere("CAST(item.maximumStock AS DECIMAL) > 0")
      .andWhere(
        "CAST(item.currentStock AS DECIMAL) > CAST(item.maximumStock AS DECIMAL)",
      )
      .orderBy("item.currentStock", "DESC")
      .limit(10)
      .getMany();

    // Map to the expected format
    const overStockItems = overStockItemsEntities.map((item) => ({
      id: item.id,
      name: item.name,
      currentStock: Number(item.currentStock || 0),
      maximumStock: Number(item.maximumStock || 0),
      unit: item.baseUom?.name || item.baseUom?.abbreviation || "",
    }));

    return {
      bestBranch: bestBranch
        ? {
            id: bestBranch.id,
            name: bestBranch.name,
            revenue: parseFloat(bestBranch.revenue || "0"),
            ordersCount: parseInt(bestBranch.ordersCount || "0"),
          }
        : null,
      topBranches: topBranches.map((b) => ({
        id: b.id,
        name: b.name,
        revenue: parseFloat(b.revenue || "0"),
        ordersCount: parseInt(b.ordersCount || "0"),
      })),
      bestProduct: bestProduct
        ? {
            id: bestProduct.id,
            name: bestProduct.name,
            unit: bestProduct.unit || "",
            quantitySold: parseFloat(String(bestProduct.quantitySold || "0")),
            revenue: parseFloat(String(bestProduct.revenue || "0")),
          }
        : null,
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit || "",
        quantitySold: parseFloat(String(p.quantitySold || "0")),
        revenue: parseFloat(String(p.revenue || "0")),
      })),
      lowStockItems: lowStockItems,
      overStockItems: overStockItems,
      lowStockCount: lowStockItems.length,
      overStockCount: overStockItems.length,
    };
  }
}
