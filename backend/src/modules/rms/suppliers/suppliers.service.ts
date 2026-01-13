import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  async create(businessId: string, createDto: CreateSupplierDto) {
    const supplier = this.supplierRepository.create({
      ...createDto,
      businessId,
    });
    return this.supplierRepository.save(supplier);
  }

  async findAll(businessId: string) {
    return this.supplierRepository.find({
      where: { businessId },
    });
  }

  async findOne(id: string, businessId: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id, businessId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async update(id: string, businessId: string, updateDto: UpdateSupplierDto) {
    await this.findOne(id, businessId);
    await this.supplierRepository.update({ id }, updateDto);
    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.supplierRepository.delete({ id });
  }
}

