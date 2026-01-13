import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Branch } from '../../../common/entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Order } from '../../rms/entities/order.entity';
import { BranchInventoryItem } from '../../ims/entities/branch-inventory-item.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(BranchInventoryItem)
    private branchInventoryRepository: Repository<BranchInventoryItem>,
  ) {}

  async create(businessId: string, createDto: CreateBranchDto) {
    // Check if branch with same name exists in this restaurant
    const existing = await this.branchRepository.findOne({
      where: { name: createDto.name, businessId },
    });

    if (existing) {
      throw new ConflictException('Branch with this name already exists');
    }

    // If this is set as default, unset other defaults
    if (createDto.isDefault) {
      await this.branchRepository.update(
        { businessId, isDefault: true },
        { isDefault: false },
      );
    }

    const branch = this.branchRepository.create({
      name: createDto.name,
      address: createDto.address,
      phone: createDto.phone,
      email: createDto.email,
      isDefault: createDto.isDefault || false,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      businessId,
    });

    return await this.branchRepository.save(branch);
  }

  async findAll(businessId: string, includeStats = false) {
    const branches = await this.branchRepository.find({
      where: { businessId },
      order: { isDefault: 'DESC', name: 'ASC' },
    });

    if (!includeStats) {
      return branches;
    }

    // Get stats for each branch
    const branchesWithStats = await Promise.all(
      branches.map(async (branch) => {
        // Get total sales for this branch
        const salesResult = await this.orderRepository
          .createQueryBuilder('order')
          .where('order.branchId = :branchId', { branchId: branch.id })
          .select('COALESCE(SUM(order.totalAmount), 0)', 'totalSales')
          .getRawOne();

        const totalSales = parseFloat(salesResult?.totalSales || '0');

        // Get low stock count for this branch (only items with minimumStock > 0 that are tracked)
        const lowStockItems = await this.branchInventoryRepository
          .createQueryBuilder('bi')
          .innerJoin('bi.inventoryItem', 'item')
          .where('bi.branchId = :branchId', { branchId: branch.id })
          .andWhere('item.businessId = :businessId', { businessId })
          .andWhere('item.isTrackable = :isTrackable', { isTrackable: true })
          .andWhere('bi.minimumStock > 0')
          .andWhere('CAST(bi.currentStock AS DECIMAL) <= CAST(bi.minimumStock AS DECIMAL)')
          .getCount();

        return {
          ...branch,
          stats: {
            lowStockCount: lowStockItems,
            totalSales,
          },
        };
      }),
    );

    return branchesWithStats;
  }

  async findOne(id: string, businessId: string) {
    const branch = await this.branchRepository.findOne({
      where: { id, businessId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, businessId: string, updateDto: UpdateBranchDto) {
    const branch = await this.branchRepository.findOne({
      where: { id, businessId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // If setting as default, unset other defaults
    if (updateDto.isDefault === true) {
      await this.branchRepository.update(
        { businessId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(branch, {
      name: updateDto.name ?? branch.name,
      address: updateDto.address ?? branch.address,
      phone: updateDto.phone ?? branch.phone,
      email: updateDto.email ?? branch.email,
      isDefault: updateDto.isDefault ?? branch.isDefault,
      isActive: updateDto.isActive ?? branch.isActive,
    });

    return await this.branchRepository.save(branch);
  }

  async remove(id: string, businessId: string) {
    const branch = await this.branchRepository.findOne({
      where: { id, businessId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    await this.branchRepository.remove(branch);
  }
}

