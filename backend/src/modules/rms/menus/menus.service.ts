import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Transactional } from "typeorm-transactional";
import { Menu } from "../entities/menu.entity";
import { MenuCategory } from "../entities/menu-category.entity";
import { MenuItem } from "../entities/menu-item.entity";
import { InventoryItem } from "../../ims/entities/inventory-item.entity";
import { InventoryCategory } from "../../ims/entities/inventory-category.entity";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";

// Helper function to generate slugs
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
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
    @InjectRepository(InventoryCategory)
    private inventoryCategoryRepository: Repository<InventoryCategory>,
  ) {}

  @Transactional()
  async create(createMenuDto: CreateMenuDto) {
    // Generate slug if not provided
    const slug = createMenuDto.slug || generateSlug(createMenuDto.name);

    // Create the menu
    const menu = this.menuRepository.create({
      name: createMenuDto.name,
      slug,
      description: createMenuDto.description,
      isActive: createMenuDto.isActive ?? true,

      branchId: createMenuDto.branchId || null,
    });
    const savedMenu = await this.menuRepository.save(menu);

    // If inventory items are provided, create categories and items
    if (
      createMenuDto.inventoryItemIds &&
      createMenuDto.inventoryItemIds.length > 0
    ) {
      // Get inventory items
      const inventoryItems = await this.inventoryItemRepository.find({
        where: {
          id: In(createMenuDto.inventoryItemIds),
        },
      });

      if (inventoryItems.length === 0) {
        throw new BadRequestException("No valid inventory items found");
      }

      // Group inventory items by category. Batched direct lookup instead of
      // the `category` relation: the relation was never loaded here (and
      // relation loads mis-resolve schema under the tenant transaction — F7),
      // so every item used to land in "Uncategorized".
      const categoryIds = [
        ...new Set(inventoryItems.map((i) => i.categoryId).filter(Boolean)),
      ];
      const categories = categoryIds.length
        ? await this.inventoryCategoryRepository.find({
            where: { id: In(categoryIds) },
          })
        : [];
      const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

      const itemsByCategory = new Map<string, InventoryItem[]>();
      inventoryItems.forEach((item) => {
        const categoryKey =
          (item.categoryId && categoryNameById.get(item.categoryId)) ||
          "Uncategorized";
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
        const savedCategory =
          await this.menuCategoryRepository.save(menuCategory);

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
          const savedMenuItem = await this.menuItemRepository.save(menuItem);

          createdItems.push({
            id: savedMenuItem.id,
            name: savedMenuItem.name,
            category: savedCategory.name,
            price: savedMenuItem.price,
          });
        }
      }

      return {
        menu: savedMenu,
        createdItems,
      };
    }

    return { menu: savedMenu, createdItems: [] };
  }

  async findAll() {
    return this.menuRepository.find({
      where: {},
      relations: ["categories", "categories.items"],
    });
  }

  async findOne(id: string) {
    const menu = await this.menuRepository.findOne({
      where: { id },
      relations: ["categories", "categories.items"],
    });

    if (!menu) {
      throw new NotFoundException("Menu not found");
    }

    return menu;
  }

  async update(id: string, updateMenuDto: UpdateMenuDto) {
    await this.findOne(id);
    await this.menuRepository.update({ id }, updateMenuDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.menuRepository.delete({ id });
  }
}
