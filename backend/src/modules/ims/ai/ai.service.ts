import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryInflow } from '../entities/inventory-inflow.entity';
import { InventoryInflowItem } from '../entities/inventory-inflow-item.entity';
import { OrderItem } from '../../rms/entities/order-item.entity';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryInflow)
    private inflowRepository: Repository<InventoryInflow>,
    @InjectRepository(InventoryInflowItem)
    private inflowItemRepository: Repository<InventoryInflowItem>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
  ) {}

  async predictDemand(itemId: string, days: number = 30) {
    const item = await this.inventoryItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Get historical order data for the last 90 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const orderItems = await this.orderItemRepository.find({
      where: {
        inventoryItemId: itemId,
        createdAt: Between(startDate, new Date()) as any,
      },
    });

    // Calculate average daily consumption
    const totalQuantity = orderItems.reduce((sum, oi) => sum + Number(oi.quantity), 0);
    const averageDailyConsumption = totalQuantity / 90;

    // Predict demand for next N days
    const predictedDemand = averageDailyConsumption * days;

    // Calculate days until stockout
    const currentStock = Number(item.currentStock);
    const daysUntilStockout = currentStock / averageDailyConsumption;

    return {
      itemId,
      itemName: item.name,
      currentStock,
      averageDailyConsumption,
      predictedDemand,
      daysUntilStockout: Math.floor(daysUntilStockout),
      recommendedReorder: daysUntilStockout < 7,
      recommendedQuantity: Math.ceil(averageDailyConsumption * 14), // 2 weeks supply
    };
  }

  async generateReorderSuggestions(businessId: string) {
    const items = await this.inventoryItemRepository.find({
      where: { businessId },
    });

    const suggestions = await Promise.all(
      items.map(async (item) => {
        const prediction = await this.predictDemand(item.id, 30);
        return {
          ...prediction,
          priority: prediction.daysUntilStockout < 3 ? 'high' : prediction.daysUntilStockout < 7 ? 'medium' : 'low',
        };
      }),
    );

    return suggestions
      .filter((s) => s.recommendedReorder)
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  }

  async analyzeInventoryHealth(businessId: string) {
    const items = await this.inventoryItemRepository.find({
      where: { businessId },
    });

    const lowStockItems = items.filter(
      (item) => Number(item.currentStock) <= Number(item.minimumStock),
    );

    const overstockItems = items.filter(
      (item) => Number(item.currentStock) > Number(item.maximumStock),
    );

    const totalValue = items.reduce(
      (sum, item) => sum + Number(item.currentStock) * Number(item.unitCost),
      0,
    );

    const lowStockValue = lowStockItems.reduce(
      (sum, item) => sum + Number(item.currentStock) * Number(item.unitCost),
      0,
    );

    return {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      overstockCount: overstockItems.length,
      totalInventoryValue: totalValue,
      lowStockValue,
      healthScore: Math.max(
        0,
        100 - (lowStockItems.length / items.length) * 100 - (overstockItems.length / items.length) * 50,
      ),
      recommendations: {
        reorder: lowStockItems.length,
        reduce: overstockItems.length,
      },
    };
  }

  async forecastSales(itemId: string, period: 'week' | 'month' | 'quarter') {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days * 2); // Get 2x period for better accuracy

    const orderItems = await this.orderItemRepository.find({
      where: {
        inventoryItemId: itemId,
        createdAt: Between(startDate, new Date()) as any,
      },
      relations: ['order'],
    });

    // Group by time period
    const grouped = orderItems.reduce((acc, oi) => {
      const date = new Date(oi.createdAt);
      const key = period === 'week'
        ? `${date.getFullYear()}-W${this.getWeekNumber(date)}`
        : period === 'month'
        ? `${date.getFullYear()}-${date.getMonth() + 1}`
        : `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;

      if (!acc[key]) {
        acc[key] = 0;
      }
      acc[key] += Number(oi.quantity);
      return acc;
    }, {} as Record<string, number>);

    const values = Object.values(grouped);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;

    return {
      itemId,
      period,
      historicalAverage: average,
      forecast: average, // Simple forecast - can be enhanced with ML
      trend: this.calculateTrend(values),
    };
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }
}

