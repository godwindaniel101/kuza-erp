import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../rms/entities/order.entity';
import { InventoryItem } from '../ims/entities/inventory-item.entity';
import { Table } from '../rms/entities/table.entity';
import { getRepository } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
  ) {}

  async getStats(businessId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales
    const todaySales = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.createdAt >= :today', { today })
      .andWhere('order.createdAt < :tomorrow', { tomorrow })
      .select('COALESCE(SUM(order.totalAmount), 0)', 'total')
      .getRawOne();

    // Active orders (pending, preparing, ready)
    const activeOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['pending', 'preparing', 'ready'] })
      .getCount();

    // Low stock items
    const lowStockItems = await this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.businessId = :businessId', { businessId })
      .andWhere('item.currentStock <= item.minimumStock')
      .getCount();

    // Table occupancy
    const totalTables = await this.tableRepository.count({
      where: { businessId },
    });

    const occupiedTables = await this.tableRepository
      .createQueryBuilder('table')
      .where('table.businessId = :businessId', { businessId })
      .andWhere('table.status = :status', { status: 'occupied' })
      .getCount();

    const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

    return {
      todaySales: parseFloat(todaySales?.total || '0'),
      activeOrders,
      lowStockCount: lowStockItems,
      occupancyRate,
    };
  }
}

