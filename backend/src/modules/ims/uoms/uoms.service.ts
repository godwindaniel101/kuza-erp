import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Uom } from '../entities/uom.entity';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { UomConversionsService } from '../uom-conversions/uom-conversions.service';

@Injectable()
export class UomsService {
  constructor(
    @InjectRepository(Uom)
    private uomRepository: Repository<Uom>,
    @Inject(forwardRef(() => UomConversionsService))
    private uomConversionsService: UomConversionsService,
  ) {}

  async create(businessId: string, createDto: CreateUomDto) {
    const uom = this.uomRepository.create({
      ...createDto,
      businessId,
    });
    return this.uomRepository.save(uom);
  }

  async findAll(businessId: string) {
    return this.uomRepository.find({
      where: { businessId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const uom = await this.uomRepository.findOne({
      where: { id, businessId },
    });

    if (!uom) {
      throw new NotFoundException('UOM not found');
    }

    return uom;
  }

  async update(id: string, businessId: string, updateDto: UpdateUomDto) {
    await this.findOne(id, businessId);
    await this.uomRepository.update({ id }, updateDto);
    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.uomRepository.delete({ id });
  }

  /**
   * Get all UOMs that are convertible from/to the given UOM using BFS
   * This finds all UOMs reachable via conversion paths
   */
  async getConvertibleUoms(baseUomId: string, businessId: string) {
    // Verify base UOM exists
    const baseUom = await this.findOne(baseUomId, businessId);

    // Get all UOMs for this restaurant
    const allUoms = await this.findAll(businessId);

    // Get all conversions
    const conversions = await this.uomConversionsService.findAll(businessId);

    // Build conversion graph (bidirectional)
    const graph: Record<string, string[]> = {};
    
    // Initialize graph with all UOM IDs
    allUoms.forEach(uom => {
      graph[uom.id] = [];
    });

    // Build edges from conversions (bidirectional)
    conversions.forEach(conv => {
      if (!graph[conv.fromUomId]) graph[conv.fromUomId] = [];
      if (!graph[conv.toUomId]) graph[conv.toUomId] = [];
      
      if (!graph[conv.fromUomId].includes(conv.toUomId)) {
        graph[conv.fromUomId].push(conv.toUomId);
      }
      if (!graph[conv.toUomId].includes(conv.fromUomId)) {
        graph[conv.toUomId].push(conv.fromUomId);
      }
    });

    // BFS to find all reachable UOMs from base UOM
    const reachable: Record<string, boolean> = { [baseUomId]: true };
    const queue: string[] = [baseUomId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = graph[current] || [];
      
      for (const neighbor of neighbors) {
        if (!reachable[neighbor]) {
          reachable[neighbor] = true;
          queue.push(neighbor);
        }
      }
    }

    // Filter UOMs to only those reachable (convertible)
    const convertibleUoms = allUoms.filter(uom => reachable[uom.id]);

    return {
      baseUom,
      convertibleUoms,
      allUoms,
    };
  }
}

