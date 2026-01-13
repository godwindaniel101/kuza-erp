import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { InventoryCategory } from '../entities/inventory-category.entity';
import { InventorySubcategory } from '../entities/inventory-subcategory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryCategory, InventorySubcategory]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
