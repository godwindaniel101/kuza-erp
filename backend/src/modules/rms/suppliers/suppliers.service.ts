import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Supplier } from "../entities/supplier.entity";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  async create(createDto: CreateSupplierDto) {
    const supplier = this.supplierRepository.create({
      ...createDto,
    });
    return this.supplierRepository.save(supplier);
  }

  async findAll() {
    return this.supplierRepository.find({
      where: {},
    });
  }

  async findOne(id: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException("Supplier not found");
    }

    return supplier;
  }

  async update(id: string, updateDto: UpdateSupplierDto) {
    await this.findOne(id);
    await this.supplierRepository.update({ id }, updateDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.supplierRepository.delete({ id });
  }
}
