import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryCategory } from '../entities/inventory-category.entity';
import { InventorySubcategory } from '../entities/inventory-subcategory.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(InventoryCategory)
    private categoryRepository: Repository<InventoryCategory>,
    @InjectRepository(InventorySubcategory)
    private subcategoryRepository: Repository<InventorySubcategory>,
  ) {}

  async findAll(businessId: string) {
    return this.categoryRepository.find({
      where: { businessId },
      relations: ['subcategories'],
      order: { name: 'ASC' },
    });
  }

  async create(businessId: string, body: { name: string; description?: string }) {
    // Check if category with same name already exists
    const existing = await this.categoryRepository.findOne({
      where: { businessId, name: body.name },
    });

    if (existing) {
      throw new Error('Category with this name already exists');
    }

    const category = this.categoryRepository.create({
      name: body.name,
      description: body.description || null,
      businessId,
    });

    return this.categoryRepository.save(category);
  }

  async findSubcategories(businessId: string, categoryId: string) {
    // Verify category exists and belongs to restaurant
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, businessId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.subcategoryRepository.find({
      where: { businessId, categoryId },
      order: { name: 'ASC' },
    });
  }

  async createSubcategory(businessId: string, categoryId: string, body: { name: string; description?: string }) {
    // Verify category exists and belongs to restaurant
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, businessId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if subcategory with same name already exists in this category
    const existing = await this.subcategoryRepository.findOne({
      where: { businessId, categoryId, name: body.name },
    });

    if (existing) {
      throw new Error('Subcategory with this name already exists in this category');
    }

    const subcategory = this.subcategoryRepository.create({
      name: body.name,
      description: body.description || null,
      categoryId,
      businessId,
    });

    return this.subcategoryRepository.save(subcategory);
  }

  async deleteCategory(businessId: string, categoryId: string) {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, businessId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.categoryRepository.remove(category);
  }

  async deleteSubcategory(businessId: string, subcategoryId: string) {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id: subcategoryId, businessId },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    await this.subcategoryRepository.remove(subcategory);
  }
}
