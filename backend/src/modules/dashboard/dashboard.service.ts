import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  async getStats(period?: string, branchIds?: string[] | null) {
    const { startDate, endDate } = this.getDateRange(period);

    // Branch scoping: a non-null list means the user is scoped (admins/unscoped
    // pass null and see all — existing behavior). A scoped user assigned to NO
    // branch (empty list) must see nothing, so we substitute a no-match sentinel
    // (an empty SQL IN (...) is invalid), yielding zero across every metric.
    const scoped = Array.isArray(branchIds);
    const bids =
      branchIds && branchIds.length
        ? branchIds
        : ['00000000-0000-0000-0000-000000000000'];

    // Sales for the selected period
    const periodSalesQb = this.orderRepository
      .createQueryBuilder('order')
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt < :endDate', { endDate })
      .select('COALESCE(SUM(order.totalAmount), 0)', 'total');
    if (scoped) {
      periodSalesQb.andWhere('order.branchId IN (:...bids)', { bids });
    }
    const periodSales = await periodSalesQb.getRawOne();

    // Active orders (pending, preparing, ready)
    const activeOrdersQb = this.orderRepository
      .createQueryBuilder('order')
      .andWhere('order.status IN (:...statuses)', { statuses: ['pending', 'preparing', 'ready'] });
    if (scoped) {
      activeOrdersQb.andWhere('order.branchId IN (:...bids)', { bids });
    }
    const activeOrders = await activeOrdersQb.getCount();

    // Low stock items - Check branch-specific inventory
    const lowStockQb = this.branchInventoryRepository
      .createQueryBuilder('bi')
      .innerJoin('bi.inventoryItem', 'item')
      .andWhere('item.isTrackable = :isTrackable', { isTrackable: true })
      .andWhere('bi.minimumStock IS NOT NULL')
      .andWhere('CAST(bi.minimumStock AS DECIMAL) > 0')
      .andWhere('CAST(bi.currentStock AS DECIMAL) <= CAST(bi.minimumStock AS DECIMAL)');
    if (scoped) {
      lowStockQb.andWhere('bi.branchId IN (:...bids)', { bids });
    }
    const lowStockItems = await lowStockQb.getCount();

    // Table occupancy
    const totalTables = await this.tableRepository.count(
      scoped ? { where: { branchId: In(bids) } } : {},
    );

    const occupiedTablesQb = this.tableRepository
      .createQueryBuilder('table')
      .andWhere('table.status = :status', { status: 'occupied' });
    if (scoped) {
      occupiedTablesQb.andWhere('table.branchId IN (:...bids)', { bids });
    }
    const occupiedTables = await occupiedTablesQb.getCount();

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

