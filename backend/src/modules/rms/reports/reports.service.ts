import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../../../common/entities/branch.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { InventoryItem } from '../../ims/entities/inventory-item.entity';

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
  ) {}

  async getAnalytics(businessId: string) {
    // Top Branches with revenue and order count
    const topBranches = await this.branchRepository
      .createQueryBuilder('branch')
      .leftJoin(Order, 'order', 'order.branchId = branch.id AND order.businessId = :businessId', { businessId })
      .select('branch.id', 'id')
      .addSelect('branch.name', 'name')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
      .addSelect('COUNT(order.id)', 'ordersCount')
      .where('branch.businessId = :businessId', { businessId })
      .groupBy('branch.id')
      .addGroupBy('branch.name')
      .orderBy('revenue', 'DESC')
      .limit(5)
      .getRawMany();

    const bestBranch = topBranches.length > 0 ? topBranches[0] : null;

    // Top Products with quantity sold and revenue
    const topProducts = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('item.id', 'id')
      .addSelect('item.name', 'name')
      .addSelect('uom.name', 'unit')
      .addSelect('COALESCE(SUM(orderItem.quantity), 0)', 'quantitySold')
      .addSelect('COALESCE(SUM(orderItem.totalPrice), 0)', 'revenue')
      .innerJoin('orderItem.inventoryItem', 'item')
      .innerJoin('orderItem.order', 'order')
      .leftJoin('item.baseUom', 'uom')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('item.businessId = :businessId', { businessId })
      .groupBy('item.id')
      .addGroupBy('item.name')
      .addGroupBy('uom.name')
      .orderBy('revenue', 'DESC')
      .limit(5)
      .getRawMany();

    const bestProduct = topProducts.length > 0 ? topProducts[0] : null;

    // Low Stock Items - Use getMany() instead of getRawMany() for proper entity mapping
    const lowStockItemsEntities = await this.inventoryItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.baseUom', 'uom')
      .where('item.businessId = :businessId', { businessId })
      .andWhere('item.isTrackable = :isTrackable', { isTrackable: true })
      .andWhere('CAST(item.currentStock AS DECIMAL) <= CAST(item.minimumStock AS DECIMAL)')
      .andWhere('CAST(item.minimumStock AS DECIMAL) > 0')
      .orderBy('item.currentStock', 'ASC')
      .limit(10)
      .getMany();

    // Map to the expected format
    const lowStockItems = lowStockItemsEntities.map(item => ({
      id: item.id,
      name: item.name,
      currentStock: Number(item.currentStock || 0),
      minimumStock: Number(item.minimumStock || 0),
      unit: item.baseUom?.name || item.baseUom?.abbreviation || '',
    }));

    // Over Stock Items - Use getMany() instead of getRawMany() for proper entity mapping
    const overStockItemsEntities = await this.inventoryItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.baseUom', 'uom')
      .where('item.businessId = :businessId', { businessId })
      .andWhere('item.isTrackable = :isTrackable', { isTrackable: true })
      .andWhere('item.maximumStock IS NOT NULL')
      .andWhere('CAST(item.maximumStock AS DECIMAL) > 0')
      .andWhere('CAST(item.currentStock AS DECIMAL) > CAST(item.maximumStock AS DECIMAL)')
      .orderBy('item.currentStock', 'DESC')
      .limit(10)
      .getMany();

    // Map to the expected format
    const overStockItems = overStockItemsEntities.map(item => ({
      id: item.id,
      name: item.name,
      currentStock: Number(item.currentStock || 0),
      maximumStock: Number(item.maximumStock || 0),
      unit: item.baseUom?.name || item.baseUom?.abbreviation || '',
    }));

    return {
      bestBranch: bestBranch ? {
        id: bestBranch.id,
        name: bestBranch.name,
        revenue: parseFloat(bestBranch.revenue || '0'),
        ordersCount: parseInt(bestBranch.ordersCount || '0'),
      } : null,
      topBranches: topBranches.map(b => ({
        id: b.id,
        name: b.name,
        revenue: parseFloat(b.revenue || '0'),
        ordersCount: parseInt(b.ordersCount || '0'),
      })),
      bestProduct: bestProduct ? {
        id: bestProduct.id,
        name: bestProduct.name,
        unit: bestProduct.unit || '',
        quantitySold: parseFloat(bestProduct.quantitySold || '0'),
        revenue: parseFloat(bestProduct.revenue || '0'),
      } : null,
      topProducts: topProducts.map(p => ({
        id: p.id,
        name: p.name,
        unit: p.unit || '',
        quantitySold: parseFloat(p.quantitySold || '0'),
        revenue: parseFloat(p.revenue || '0'),
      })),
      lowStockItems: lowStockItems,
      overStockItems: overStockItems,
      lowStockCount: lowStockItems.length,
      overStockCount: overStockItems.length,
    };
  }
}
