import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Menu } from '../entities/menu.entity';
import { MenuCategory } from '../entities/menu-category.entity';
import { MenuItem } from '../entities/menu-item.entity';
import { InventoryItem } from '../../ims/entities/inventory-item.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

// Helper function to generate slugs
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
    @InjectRepository(MenuCategory)
    private menuCategoryRepository: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    private dataSource: DataSource,
  ) {}

  async create(businessId: string, createMenuDto: CreateMenuDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate slug if not provided
      const slug = createMenuDto.slug || generateSlug(createMenuDto.name);

      // Create the menu
      const menu = this.menuRepository.create({
        name: createMenuDto.name,
        slug,
        description: createMenuDto.description,
        isActive: createMenuDto.isActive ?? true,
        businessId,
        branchId: createMenuDto.branchId || null,
      });
      const savedMenu = await queryRunner.manager.save(Menu, menu);

      // If inventory items are provided, create categories and items
      if (createMenuDto.inventoryItemIds && createMenuDto.inventoryItemIds.length > 0) {
        // Get inventory items
        const inventoryItems = await this.inventoryItemRepository.find({
          where: {
            id: In(createMenuDto.inventoryItemIds),
            businessId,
          },
        });

        if (inventoryItems.length === 0) {
          throw new BadRequestException('No valid inventory items found');
        }

        // Group inventory items by category
        const itemsByCategory = new Map<string, InventoryItem[]>();
        inventoryItems.forEach((item) => {
          const category = item.category || 'Uncategorized';
          // Ensure category is a string (it should be from the relation name)
          const categoryKey = typeof category === 'string' ? category : (category as any)?.name || 'Uncategorized';
          if (!itemsByCategory.has(categoryKey)) {
            itemsByCategory.set(categoryKey, []);
          }
          itemsByCategory.get(categoryKey)!.push(item);
        });

        const createdItems = [];

        // Create categories and items
        let categorySortOrder = 0;
        for (const [categoryName, items] of itemsByCategory.entries()) {
          // Create menu category
          const menuCategory = this.menuCategoryRepository.create({
            menuId: savedMenu.id,
            name: categoryName,
            description: null,
            sortOrder: categorySortOrder++,
          });
          const savedCategory = await queryRunner.manager.save(MenuCategory, menuCategory);

          // Create menu items for each inventory item
          let itemSortOrder = 0;
          for (const inventoryItem of items) {
            const menuItem = this.menuItemRepository.create({
              menuId: savedMenu.id,
              categoryId: savedCategory.id,
              inventoryItemId: inventoryItem.id,
              name: inventoryItem.name,
              description: null,
              price: Number(inventoryItem.salePrice || 0),
              isAvailable: true,
              sortOrder: itemSortOrder++,
            });
            const savedMenuItem = await queryRunner.manager.save(MenuItem, menuItem);

            createdItems.push({
              id: savedMenuItem.id,
              name: savedMenuItem.name,
              category: savedCategory.name,
              price: savedMenuItem.price,
            });
          }
        }

        await queryRunner.commitTransaction();

        return {
          menu: savedMenu,
          createdItems,
        };
      }

      await queryRunner.commitTransaction();
      return { menu: savedMenu, createdItems: [] };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(businessId: string) {
    return this.menuRepository.find({
      where: { businessId },
      relations: ['categories', 'categories.items'],
    });
  }

  async findOne(id: string, businessId: string) {
    const menu = await this.menuRepository.findOne({
      where: { id, businessId },
      relations: ['categories', 'categories.items'],
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    return menu;
  }

  async update(id: string, businessId: string, updateMenuDto: UpdateMenuDto) {
    await this.findOne(id, businessId);
    await this.menuRepository.update({ id }, updateMenuDto);
    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.menuRepository.delete({ id });
  }
}
