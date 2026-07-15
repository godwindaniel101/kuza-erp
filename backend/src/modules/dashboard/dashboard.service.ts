import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../rms/entities/order.entity';
import { BranchInventoryItem } from '../ims/entities/branch-inventory-item.entity';
import { Table } from '../rms/entities/table.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(BranchInventoryItem)
    private branchInventoryRepository: Repository<BranchInventoryItem>,
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
  ) {}

  private getDateRange(period?: string) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'week':
        // Start of current week (Sunday)
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'month':
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

  async getStats(period?: string) {
    const { startDate, endDate } = this.getDateRange(period);

    // Sales for the selected period
    const periodSales = await this.orderRepository
      .createQueryBuilder('order')
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt < :endDate', { endDate })
      .select('COALESCE(SUM(order.totalAmount), 0)', 'total')
      .getRawOne();

    // Active orders (pending, preparing, ready)
    const activeOrders = await this.orderRepository
      .createQueryBuilder('order')
      .andWhere('order.status IN (:...statuses)', { statuses: ['pending', 'preparing', 'ready'] })
      .getCount();

    // Low stock items - Check branch-specific inventory
    const lowStockItems = await this.branchInventoryRepository
      .createQueryBuilder('bi')
      .innerJoin('bi.inventoryItem', 'item')
      .andWhere('item.isTrackable = :isTrackable', { isTrackable: true })
      .andWhere('bi.minimumStock IS NOT NULL')
      .andWhere('CAST(bi.minimumStock AS DECIMAL) > 0')
      .andWhere('CAST(bi.currentStock AS DECIMAL) <= CAST(bi.minimumStock AS DECIMAL)')
      .getCount();

    // Table occupancy
    const totalTables = await this.tableRepository.count();

    const occupiedTables = await this.tableRepository
      .createQueryBuilder('table')
      .andWhere('table.status = :status', { status: 'occupied' })
      .getCount();

    const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

    return {
      periodSales: parseFloat(periodSales?.total || '0'),
      todaySales: parseFloat(periodSales?.total || '0'), // Keep for backwards compatibility
      activeOrders,
      lowStockCount: lowStockItems,
      occupancyRate,
    };
  }
}

