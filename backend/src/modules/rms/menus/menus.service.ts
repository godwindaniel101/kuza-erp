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
import { InventorySubcategory } from "../../ims/entities/inventory-subcategory.entity";
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
    @InjectRepository(InventorySubcategory)
    private inventorySubcategoryRepository: Repository<InventorySubcategory>,
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
      const createdItems = await this.buildMenuItems(
        savedMenu.id,
        createMenuDto.inventoryItemIds,
      );
      return { menu: savedMenu, createdItems };
    }

    return { menu: savedMenu, createdItems: [] };
  }

  /**
   * (Re)build a menu's categories + items from a set of inventory item ids,
   * grouping by inventory category. Used by both create and update.
   * Direct category lookup (not the `category` relation) because relation loads
   * mis-resolve schema under the tenant transaction (F7).
   */
  private async buildMenuItems(menuId: string, inventoryItemIds: string[]) {
    const inventoryItems = await this.inventoryItemRepository.find({
      where: { id: In(inventoryItemIds) },
    });

    if (inventoryItems.length === 0) {
      throw new BadRequestException("No valid inventory items found");
    }

    const categoryIds = [
      ...new Set(inventoryItems.map((i) => i.categoryId).filter(Boolean)),
    ];
    const categories = categoryIds.length
      ? await this.inventoryCategoryRepository.find({
          where: { id: In(categoryIds) },
        })
      : [];
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

    // Resolve subcategory names too (for two-level menus).
    const subcategoryIds = [
      ...new Set(inventoryItems.map((i) => i.subcategoryId).filter(Boolean)),
    ];
    const subcategories = subcategoryIds.length
      ? await this.inventorySubcategoryRepository.find({
          where: { id: In(subcategoryIds) },
        })
      : [];
    const subcategoryNameById = new Map(subcategories.map((s) => [s.id, s.name]));

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
    let categorySortOrder = 0;
    for (const [categoryName, items] of itemsByCategory.entries()) {
      const savedCategory = await this.menuCategoryRepository.save(
        this.menuCategoryRepository.create({
          menuId,
          name: categoryName,
          description: null,
          sortOrder: categorySortOrder++,
        }),
      );

      let itemSortOrder = 0;
      for (const inventoryItem of items) {
        const savedMenuItem = await this.menuItemRepository.save(
          this.menuItemRepository.create({
            menuId,
            categoryId: savedCategory.id,
            inventoryItemId: inventoryItem.id,
            name: inventoryItem.name,
            description: null,
            price: Number(inventoryItem.salePrice || 0),
            // Carry the inventory item's photo onto the menu item so templates
            // can show it (the make-up item's frontImage is the dish photo).
            image: inventoryItem.frontImage || null,
            subcategory:
              (inventoryItem.subcategoryId &&
                subcategoryNameById.get(inventoryItem.subcategoryId)) ||
              null,
            isAvailable: true,
            sortOrder: itemSortOrder++,
          }),
        );
        createdItems.push({
          id: savedMenuItem.id,
          name: savedMenuItem.name,
          category: savedCategory.name,
          price: savedMenuItem.price,
        });
      }
    }
    return createdItems;
  }

  /** Fill any menu item missing an image from its linked inventory item's
   * frontImage, and subcategory from its inventory subcategory. Mutates the
   * passed items in place. Read-time fallback for menus built before these
   * were copied onto the menu item. */
  private async fillItemImages(items: MenuItem[]) {
    const needing = items.filter(
      (i) => (!i.image || !i.subcategory) && i.inventoryItemId,
    );
    if (needing.length === 0) return;
    const invIds = [...new Set(needing.map((i) => i.inventoryItemId))];
    const inv = await this.inventoryItemRepository.find({
      where: { id: In(invIds) },
    });
    const invById = new Map(inv.map((i) => [i.id, i]));

    const subIds = [
      ...new Set(inv.map((i) => i.subcategoryId).filter(Boolean)),
    ];
    const subs = subIds.length
      ? await this.inventorySubcategoryRepository.find({
          where: { id: In(subIds) },
        })
      : [];
    const subNameById = new Map(subs.map((s) => [s.id, s.name]));

    for (const item of needing) {
      const invItem = invById.get(item.inventoryItemId);
      if (!invItem) continue;
      if (!item.image && invItem.frontImage) item.image = invItem.frontImage;
      if (!item.subcategory && invItem.subcategoryId) {
        item.subcategory = subNameById.get(invItem.subcategoryId) || null;
      }
    }
  }

  /** Delete a menu's items then categories (order_items keep their snapshot;
   * order_items.menuItemId has no FK, so dangling references are harmless). */
  private async clearMenuItems(menuId: string) {
    const cats = await this.menuCategoryRepository.find({ where: { menuId } });
    const catIds = cats.map((c) => c.id);
    if (catIds.length) {
      await this.menuItemRepository.delete({ categoryId: In(catIds) });
    }
    await this.menuItemRepository.delete({ menuId });
    await this.menuCategoryRepository.delete({ menuId });
  }

  async findAll() {
    const menus = await this.menuRepository.find({ where: {}, order: { createdAt: "DESC" } });
    if (menus.length === 0) return [];
    const menuIds = menus.map((m) => m.id);
    const categories = await this.menuCategoryRepository.find({
      where: { menuId: In(menuIds) },
      order: { sortOrder: "ASC" },
    });
    const catIds = categories.map((c) => c.id);
    const items = catIds.length
      ? await this.menuItemRepository.find({ where: { categoryId: In(catIds) }, order: { sortOrder: "ASC" } })
      : [];
    const itemsByCat = new Map<string, MenuItem[]>();
    items.forEach((it) => {
      const list = itemsByCat.get(it.categoryId) || [];
      list.push(it);
      itemsByCat.set(it.categoryId, list);
    });
    const catsByMenu = new Map<string, any[]>();
    categories.forEach((c) => {
      const list = catsByMenu.get(c.menuId) || [];
      list.push({ ...c, items: itemsByCat.get(c.id) || [] });
      catsByMenu.set(c.menuId, list);
    });
    return menus.map((m) => ({ ...m, categories: catsByMenu.get(m.id) || [] }));
  }

  async findOne(id: string) {
    const menu = await this.menuRepository.findOne({ where: { id } });
    if (!menu) {
      throw new NotFoundException("Menu not found");
    }

    // Load categories + items via direct queries and stitch them together.
    // Nested relations ("categories.items") mis-resolve across tenant schemas
    // here, which left the edit screen with no pre-selected items.
    const categories = await this.menuCategoryRepository.find({
      where: { menuId: id },
      order: { sortOrder: "ASC" },
    });
    const catIds = categories.map((c) => c.id);
    const items = catIds.length
      ? await this.menuItemRepository.find({
          where: { categoryId: In(catIds) },
          order: { sortOrder: "ASC" },
        })
      : [];

    // Backfill missing dish photos from the linked inventory item so menus
    // created before images were carried over still display them.
    await this.fillItemImages(items);

    const itemsByCat = new Map<string, MenuItem[]>();
    for (const it of items) {
      const list = itemsByCat.get(it.categoryId) || [];
      list.push(it);
      itemsByCat.set(it.categoryId, list);
    }
    return {
      ...menu,
      categories: categories.map((c) => ({ ...c, items: itemsByCat.get(c.id) || [] })),
    };
  }

  async update(id: string, updateMenuDto: UpdateMenuDto) {
    await this.findOne(id);

    // inventoryItemIds isn't a menu column — pull it out and, when present,
    // rebuild the menu's categories/items so item edits actually persist.
    const { inventoryItemIds, ...scalar } = updateMenuDto as UpdateMenuDto & {
      inventoryItemIds?: string[];
    };

    if (Object.keys(scalar).length > 0) {
      await this.menuRepository.update({ id }, scalar);
    }

    if (Array.isArray(inventoryItemIds)) {
      await this.clearMenuItems(id);
      if (inventoryItemIds.length > 0) {
        await this.buildMenuItems(id, inventoryItemIds);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.menuRepository.delete({ id });
  }
}
