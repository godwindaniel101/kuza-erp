import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UomConversion } from '../entities/uom-conversion.entity';
import { Uom } from '../entities/uom.entity';

@Injectable()
export class UomConversionsService {
  constructor(
    @InjectRepository(UomConversion)
    private conversionRepository: Repository<UomConversion>,
    @InjectRepository(Uom)
    private uomRepository: Repository<Uom>,
  ) {}

  async findAll(businessId: string) {
    return await this.conversionRepository.find({
      where: { businessId },
      relations: ['fromUom', 'toUom'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(businessId: string, body: { fromUomId: string; toUomId: string; factor: number }) {
    if (body.fromUomId === body.toUomId) {
      throw new ConflictException('Cannot create conversion between the same units');
    }

    // Verify both UOMs exist and belong to this restaurant
    const fromUom = await this.uomRepository.findOne({
      where: { id: body.fromUomId, businessId },
    });
    const toUom = await this.uomRepository.findOne({
      where: { id: body.toUomId, businessId },
    });

    if (!fromUom || !toUom) {
      throw new NotFoundException('One or both UOMs not found');
    }

    const factor = Number(body.factor);
    if (factor <= 0) {
      throw new ConflictException('Conversion factor must be greater than 0');
    }

    // Check if conversion already exists
    const existing = await this.conversionRepository.findOne({
      where: { businessId, fromUomId: body.fromUomId, toUomId: body.toUomId },
    });

    if (existing) {
      // Update existing conversion
      existing.factor = factor;
      existing.effectiveFrom = new Date();
      return await this.conversionRepository.save(existing);
    }

    // Create conversion in both directions
    const conversion = this.conversionRepository.create({
      businessId,
      fromUomId: body.fromUomId,
      toUomId: body.toUomId,
      factor,
      effectiveFrom: new Date(),
    });

    const saved = await this.conversionRepository.save(conversion);

    // Create reverse conversion
    const reverseConversion = this.conversionRepository.create({
      businessId,
      fromUomId: body.toUomId,
      toUomId: body.fromUomId,
      factor: 1 / factor,
      effectiveFrom: new Date(),
    });

    await this.conversionRepository.save(reverseConversion);

    return await this.conversionRepository.findOne({
      where: { id: saved.id },
      relations: ['fromUom', 'toUom'],
    });
  }

  async remove(id: string, businessId: string) {
    const conversion = await this.conversionRepository.findOne({
      where: { id, businessId },
    });

    if (!conversion) {
      throw new NotFoundException('Conversion not found');
    }

    // Also remove reverse conversion
    await this.conversionRepository.delete({
      businessId,
      fromUomId: conversion.toUomId,
      toUomId: conversion.fromUomId,
    });

    await this.conversionRepository.remove(conversion);
  }

  /**
   * Get multiplier to convert from one UOM to another
   * Returns multiplier where: qty_to = qty_from * multiplier
   */
  async getMultiplier(businessId: string, fromUomId: string, toUomId: string): Promise<number | null> {
    if (fromUomId === toUomId) return 1.0;

    // Try direct conversion
    const direct = await this.conversionRepository.findOne({
      where: { businessId, fromUomId, toUomId },
    });

    if (direct) {
      return Number(direct.factor);
    }

    // Try reverse conversion
    const reverse = await this.conversionRepository.findOne({
      where: { businessId, fromUomId: toUomId, toUomId: fromUomId },
    });

    if (reverse) {
      return 1 / Number(reverse.factor);
    }

    // For now, return null if no conversion found
    // In a full implementation, we'd do a graph traversal to find paths
    return null;
  }

  /**
   * Convert quantity from one UOM to another
   * @returns converted quantity in target UOM
   */
  async convert(businessId: string, fromUomId: string, toUomId: string, quantity: number): Promise<number> {
    if (fromUomId === toUomId) return quantity;
    
    const multiplier = await this.getMultiplier(businessId, fromUomId, toUomId);
    if (multiplier === null) {
      throw new NotFoundException(`No conversion found from UOM ${fromUomId} to ${toUomId}`);
    }
    
    return quantity * multiplier;
  }

  /**
   * Get all conversions (direct and indirect) for a specific UOM using BFS
   * Returns all conversions where the UOM appears as either from or to
   */
  async getConversionsForUom(uomId: string, businessId: string) {
    // Get all conversions
    const allConversions = await this.findAll(businessId);
    
    // Get all UOMs for building paths
    const allUoms = await this.uomRepository.find({
      where: { businessId },
    });
    const uomsMap = new Map<string, any>();
    allUoms.forEach(uom => uomsMap.set(uom.id, uom));

    // Get direct conversions first (from or to this UOM)
    const directConversions = allConversions
      .filter(conv => conv.fromUomId === uomId || conv.toUomId === uomId)
      .map(conv => {
        const factor = Number(conv.factor);
        // Normalize: always show from the requested UOM
        if (conv.fromUomId === uomId) {
          return {
            fromUom: conv.fromUom || uomsMap.get(conv.fromUomId),
            toUom: conv.toUom || uomsMap.get(conv.toUomId),
            factor,
            isDirect: true,
          };
        } else {
          // Reverse: show as from requested UOM
          return {
            fromUom: conv.toUom || uomsMap.get(conv.toUomId),
            toUom: conv.fromUom || uomsMap.get(conv.fromUomId),
            factor: 1 / factor,
            isDirect: true,
          };
        }
      });

    // Build conversion graph (bidirectional) with factors for BFS
    const graph: Record<string, Array<{ id: string; factor: number }>> = {};
    
    // Initialize graph with all UOM IDs
    allUoms.forEach(uom => {
      graph[uom.id] = [];
    });

    // Build edges from conversions (bidirectional with factors)
    allConversions.forEach(conv => {
      const factor = Number(conv.factor);
      // Forward edge: from -> to with factor
      if (!graph[conv.fromUomId].find(e => e.id === conv.toUomId)) {
        graph[conv.fromUomId].push({ id: conv.toUomId, factor });
      }
      // Reverse edge: to -> from with 1/factor
      if (!graph[conv.toUomId].find(e => e.id === conv.fromUomId)) {
        graph[conv.toUomId].push({ id: conv.fromUomId, factor: 1 / factor });
      }
    });

    // BFS to find all reachable UOMs from the requested UOM
    const visited = new Set<string>();
    const queue: Array<{ id: string; totalFactor: number }> = [{ id: uomId, totalFactor: 1 }];
    const indirectConversions: Array<{ 
      fromUom: any; 
      toUom: any; 
      factor: number; 
      isDirect: boolean;
    }> = [];

    visited.add(uomId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      const neighbors = graph[current.id] || [];
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          const newTotalFactor = current.totalFactor * neighbor.factor;
          
          const fromUom = uomsMap.get(uomId);
          const toUom = uomsMap.get(neighbor.id);
          
          if (fromUom && toUom && neighbor.id !== uomId) {
            // Check if this is a direct conversion (already included)
            const isDirectConversion = directConversions.some(dc => 
              (dc.fromUom?.id === uomId && dc.toUom?.id === neighbor.id)
            );
            
            if (!isDirectConversion) {
              indirectConversions.push({
                fromUom,
                toUom,
                factor: newTotalFactor,
                isDirect: false,
              });
            }
          }
          
          queue.push({ id: neighbor.id, totalFactor: newTotalFactor });
        }
      }
    }

    // Combine direct and indirect conversions, remove duplicates
    const allConversionsMap = new Map<string, any>();
    [...directConversions, ...indirectConversions].forEach(conv => {
      const key = `${conv.fromUom?.id}-${conv.toUom?.id}`;
      // Prefer direct conversions over indirect
      if (!allConversionsMap.has(key) || conv.isDirect) {
        allConversionsMap.set(key, conv);
      }
    });

    return Array.from(allConversionsMap.values());
  }
}
