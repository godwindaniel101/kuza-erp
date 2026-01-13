import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderPayment } from '../entities/order-payment.entity';
import { OrderItemInflowItem } from '../entities/order-item-inflow-item.entity';
import { InventoryItem } from '../../ims/entities/inventory-item.entity';
import { InventoryInflowItem } from '../../ims/entities/inventory-inflow-item.entity';
import { BranchInventoryItem } from '../../ims/entities/branch-inventory-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { Branch } from '../../../common/entities/branch.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { UomConversionsService } from '../../ims/uom-conversions/uom-conversions.service';
import { Uom } from '../../ims/entities/uom.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderPayment)
    private orderPaymentRepository: Repository<OrderPayment>,
    @InjectRepository(OrderItemInflowItem)
    private orderItemInflowItemRepository: Repository<OrderItemInflowItem>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryInflowItem)
    private inflowItemRepository: Repository<InventoryInflowItem>,
    @InjectRepository(BranchInventoryItem)
    private branchInventoryRepository: Repository<BranchInventoryItem>,
    private uomConversionsService: UomConversionsService,
    private dataSource: DataSource,
  ) {}

  /**
   * Allocate inventory from inflows based on allocation method
   * Actually picks specific inflow items and calculates allocation details
   * Returns allocation details including which inflow items were used
   */
  private async allocateInventory(
    businessId: string,
    branchId: string,
    inventoryItemId: string,
    quantityBase: number,
    allocationMethod: string,
  ): Promise<{
    costPrice: number;
    costTotal: number;
    allocations: Array<{
      inflowItemId: string;
      quantityUsed: number;
      costPerUnit: number;
      totalCost: number;
    }>;
  }> {
    console.log(`[Allocation] *** STARTING ALLOCATION *** inventoryItemId: ${inventoryItemId}, branchId: ${branchId}, quantityBase: ${quantityBase}, allocationMethod: ${allocationMethod}`);
    
    // Get all inflow items for this inventory item in the specific branch only
    // Use raw SQL query because TypeORM query builder with joins doesn't reliably translate property names
    console.log(`[Allocation] Querying inflow items for inventoryItemId: ${inventoryItemId}, branchId: ${branchId}`);
    
    let orderByClause = '';
    if (allocationMethod === 'FEFO') {
      orderByClause = 'ORDER BY item.expiry_date ASC NULLS LAST, item.created_at ASC';
    } else if (allocationMethod === 'LIFO') {
      orderByClause = 'ORDER BY item.created_at DESC';
    } else {
      // FIFO (default)
      orderByClause = 'ORDER BY item.created_at ASC';
    }

    // Query to get inflow items for this inventory item in the SPECIFIC BRANCH ONLY
    // This ensures sales only pick from inflows done to that particular branch
    // Uses item.branch_id (not inflow.branch_id) to filter by the branch the item was assigned to
    const query = `
      SELECT item.*
      FROM inventory_inflow_items item
      INNER JOIN inventory_inflows inflow ON item.inflow_id = inflow.id
      WHERE item.inventory_item_id = $1
        AND inflow.business_id = $2
        AND item.branch_id = $3
      ${orderByClause}
    `;
    
    const rawItems = await this.inflowItemRepository.query(query, [inventoryItemId, businessId, branchId]);
    
    // Load full entities from the IDs
    const itemIds = rawItems.map((item: any) => item.id);
    let inflowItems: any[] = [];
    if (itemIds.length > 0) {
      inflowItems = await this.inflowItemRepository.find({
        where: { id: In(itemIds) },
        order: allocationMethod === 'FEFO' 
          ? { expiryDate: 'ASC', createdAt: 'ASC' }
          : allocationMethod === 'LIFO'
          ? { createdAt: 'DESC' }
          : { createdAt: 'ASC' },
      });
    }

      console.log(`[Allocation] Found ${inflowItems.length} inflow items for inventoryItemId: ${inventoryItemId}, branchId: ${branchId}`);
      
      // Log details of each inflow item found
      inflowItems.forEach((item, index) => {
        console.log(`[Allocation] Inflow item ${index + 1}: id=${item.id}, baseQuantity=${item.baseQuantity}, unitCost=${item.unitCost}, createdAt=${item.createdAt}`);
      });
      
      if (inflowItems.length === 0) {
        console.log(`[Allocation] ERROR: No inflow items found for inventoryItemId: ${inventoryItemId}, branchId: ${branchId}`);
        throw new BadRequestException(`No inventory available for this item in the selected branch. Please ensure the item has been received in this branch before selling.`);
      }

      // Calculate how much has already been sold from each inflow item
      // FIFO allocation: Use first inflow until exhausted, then move to next
      // This creates separate batches (OrderItemInflowItem records) for each inflow used
      const allocations: Array<{
        inflowItemId: string;
        quantityUsed: number;
        costPerUnit: number;
        totalCost: number;
      }> = [];

      let remainingQuantity = quantityBase;
      console.log(`[Allocation] Starting allocation for ${quantityBase} units across ${inflowItems.length} inflow items`);

      // FIFO: Process inflows in order (oldest first), using each until exhausted
      for (const inflowItem of inflowItems) {
        if (remainingQuantity <= 0) break;

        console.log(`[Allocation] Processing inflow item ${inflowItem.id}, baseQuantity: ${inflowItem.baseQuantity}`);

        // Calculate remaining quantity for this inflow item
        // Sum all quantityUsed from OrderItemInflowItem records for this inflow item
        const soldQuery = `
          SELECT COALESCE(SUM(quantity_used), 0) as total_sold
          FROM order_item_inflow_items
          WHERE inflow_item_id = $1
        `;
        const soldResult = await this.orderItemInflowItemRepository.query(soldQuery, [inflowItem.id]);
        const totalSold = Number(soldResult[0]?.total_sold || 0);
        const availableQuantity = Math.max(0, Number(inflowItem.baseQuantity || 0) - totalSold);

        console.log(`[Allocation] Inflow item ${inflowItem.id}: totalSold=${totalSold}, availableQuantity=${availableQuantity}, remainingQuantity=${remainingQuantity}`);

        if (availableQuantity > 0) {
          const quantityToUse = Math.min(remainingQuantity, availableQuantity);
          // IMPORTANT: Use inflow item's unitCost (cost price from when item was received)
          // NOT the sales price - this ensures accurate cost tracking and profit calculation
          const costPerUnit = Number(inflowItem.unitCost || 0);
          const totalCost = quantityToUse * costPerUnit;

          console.log(`[Allocation] Using ${quantityToUse} units from inflow item ${inflowItem.id} at cost ${costPerUnit} per unit (total: ${totalCost})`);

          allocations.push({
            inflowItemId: inflowItem.id,
            quantityUsed: quantityToUse,
            costPerUnit,
            totalCost: Math.round(totalCost * 100) / 100,
          });

          remainingQuantity -= quantityToUse;
        }
      }

      console.log(`[Allocation] Final allocation: ${allocations.length} allocations, remaining quantity: ${remainingQuantity}`);

      if (allocations.length === 0) {
        console.log(`[Allocation] ERROR: No available quantity in inflow items for inventoryItemId: ${inventoryItemId}, branchId: ${branchId}`);
        throw new BadRequestException(`All inventory for this item in the selected branch has been sold out. Please restock or reduce the quantity.`);
      }

      // Check if we could fulfill the full requested quantity
      if (remainingQuantity > 0) {
        const allocatedQuantity = quantityBase - remainingQuantity;
        console.log(`[Allocation] ERROR: Insufficient inventory. Requested: ${quantityBase}, Available: ${allocatedQuantity}`);
        throw new BadRequestException(`Insufficient inventory in this branch. Requested: ${quantityBase}, Available: ${allocatedQuantity}. Please restock or reduce the quantity.`);
      }

      // Calculate weighted average cost
      const totalCost = allocations.reduce((sum, alloc) => sum + alloc.totalCost, 0);
      const costPrice = quantityBase > 0 ? totalCost / quantityBase : 0;

      console.log(`[Allocation] Item: ${inventoryItemId}, quantityBase: ${quantityBase}, allocations: ${allocations.length}, costTotal: ${totalCost}`);
      console.log(`[Allocation] Allocations details:`, allocations.map(a => ({ id: a.inflowItemId, qty: a.quantityUsed, cost: a.totalCost })));

      return {
        costPrice: Math.round(costPrice * 100) / 100,
        costTotal: Math.round(totalCost * 100) / 100,
        allocations,
      };
  }

  async create(businessId: string, branchId: string, createOrderDto: CreateOrderDto) {
    console.log(`[OrderCreate] *** STARTING ORDER CREATION *** businessId: ${businessId}, branchId: ${branchId}`);
    console.log(`[OrderCreate] Order items:`, createOrderDto.items.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity, uomId: i.uomId })));
    
    try {
      // Generate shorter order number: ORD-{last8digitsoftimestamp}{4randomchars}
      // e.g., ORD-09292771K8M2 (17 chars vs previous 30+ chars)
      const timestamp = Date.now().toString();
      const shortTimestamp = timestamp.slice(-8); // Last 8 digits
      const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase();
      const orderNumber = `ORD-${shortTimestamp}${randomPart}`;

      // Get allocation method (default to FIFO)
      const allocationMethod = 'FIFO'; // TODO: Fetch from branch settings

      // Calculate subtotal and allocate inventory
      let subtotal = 0;
      let totalCost = 0;
      const orderItemsWithAllocations = await Promise.all(
        createOrderDto.items.map(async (item) => {
          // Fetch inventory item to get price and name
          const inventoryItem = await this.inventoryItemRepository.findOne({
            where: { id: item.inventoryItemId, businessId },
            relations: ['baseUom'],
          });

          if (!inventoryItem) {
            throw new NotFoundException(`Inventory item with ID ${item.inventoryItemId} not found`);
          }

          // Use the provided UOM ID
          const uomId = item.uomId;
          const baseUomId = inventoryItem.baseUomId;
          const basePrice = Number(inventoryItem.salePrice) || 0;

          // Calculate price based on UOM conversion
          let unitPrice = basePrice;
          if (uomId && uomId !== baseUomId) {
            const multiplier = await this.uomConversionsService.getMultiplier(businessId, uomId, baseUomId);
            if (multiplier !== null && multiplier > 0) {
              unitPrice = basePrice * multiplier;
            }
          }

          const quantity = Number(item.quantity);
          const totalPrice = unitPrice * quantity;
          subtotal += totalPrice;

          // Calculate base quantity
          let quantityBase = quantity;
          if (uomId && uomId !== baseUomId) {
            const multiplier = await this.uomConversionsService.getMultiplier(businessId, uomId, baseUomId);
            if (multiplier !== null && multiplier > 0) {
              quantityBase = quantity * multiplier;
            }
          }

          // Allocate inventory and calculate cost
          const allocation = await this.allocateInventory(
            businessId,
            branchId,
            item.inventoryItemId,
            quantityBase,
            allocationMethod,
          );

          console.log(`[Allocation] Item: ${inventoryItem.name}, quantityBase: ${quantityBase}, costPrice: ${allocation.costPrice}, costTotal: ${allocation.costTotal}, allocations: ${allocation.allocations.length}`);
          console.log(`[Allocation] Allocation details:`, allocation.allocations);
          totalCost += allocation.costTotal;

          return {
            item: this.orderItemRepository.create({
              inventoryItemId: item.inventoryItemId,
              name: inventoryItem.name,
              quantity,
              quantityBase,
              unitPrice,
              totalPrice,
              costPrice: allocation.costPrice,
              costTotal: allocation.costTotal,
              uomId,
            }),
            allocations: allocation.allocations,
          };
        }),
      );

      // Calculate VAT if enabled
      const applyVat = createOrderDto.applyVat || false;
      const vatPercentage = applyVat ? (createOrderDto.vatPercentage || 7.5) : 0;
      const tax = applyVat ? (subtotal * vatPercentage) / 100 : 0;
      const totalAmount = subtotal + tax;
      const profit = subtotal - totalCost;

      console.log(`[OrderCreate] Order totals - subtotal: ${subtotal}, totalCost: ${totalCost}, profit: ${profit}`);

      const order = this.orderRepository.create({
        businessId,
        branchId,
        tableId: createOrderDto.tableId || null,
        orderNumber,
        subtotal,
        tax,
        totalAmount,
        totalCost,
        profit,
        allocationMethod,
        status: 'pending',
        notes: createOrderDto.notes || null,
        customerName: createOrderDto.customerName || null,
        customerPhone: createOrderDto.customerPhone || null,
        orderType: createOrderDto.type || 'dine_in',
      });

      const savedOrder = await this.orderRepository.save(order);
      console.log(`[OrderCreate] Saved order with ID: ${savedOrder.id}, totalCost: ${savedOrder.totalCost}`);

      // Save order items, create allocation tracking records, and update stock
      for (const { item: itemEntity, allocations } of orderItemsWithAllocations) {
        itemEntity.orderId = savedOrder.id;
        console.log(`[Save OrderItem] Saving item: ${itemEntity.name}, orderId: ${savedOrder.id}, allocations: ${allocations.length}`);
        const savedOrderItem = await this.orderItemRepository.save(itemEntity);
        console.log(`[Save OrderItem] Saved item with ID: ${savedOrderItem.id}, orderId: ${savedOrderItem.orderId}`);
        

        // Create OrderItemInflowItem records to track which inflow items were used
        if (allocations.length === 0) {
          console.log(`[Save OrderItemInflowItem] WARNING: No allocations found for item ${savedOrderItem.id}`);
        }
        
        for (const allocation of allocations) {
          const orderItemInflowItem = this.orderItemInflowItemRepository.create({
            orderItemId: savedOrderItem.id,
            inflowItemId: allocation.inflowItemId,
            quantityUsed: allocation.quantityUsed,
            costPerUnit: allocation.costPerUnit,
            totalCost: allocation.totalCost,
          });
          console.log(`[Save OrderItemInflowItem] Creating record: orderItemId=${savedOrderItem.id}, inflowItemId=${allocation.inflowItemId}, quantityUsed=${allocation.quantityUsed}, costPerUnit=${allocation.costPerUnit}, totalCost=${allocation.totalCost}`);
          const savedInflowItem = await this.orderItemInflowItemRepository.save(orderItemInflowItem);
          console.log(`[Save OrderItemInflowItem] Saved record with ID: ${savedInflowItem.id}`);
        }

        // Update stock
        const inventoryItem = await this.inventoryItemRepository.findOne({
          where: { id: itemEntity.inventoryItemId, businessId },
        });

        if (inventoryItem) {
          inventoryItem.currentStock = Math.max(0, Number(inventoryItem.currentStock || 0) - Number(itemEntity.quantityBase || 0));
          await this.inventoryItemRepository.save(inventoryItem);
        }

        // Update branch inventory
        let branchInventory = await this.branchInventoryRepository.findOne({
          where: {
            branchId,
            inventoryItemId: itemEntity.inventoryItemId,
          },
        });

        if (branchInventory) {
          branchInventory.currentStock = Math.max(0, Number(branchInventory.currentStock || 0) - Number(itemEntity.quantityBase || 0));
          await this.branchInventoryRepository.save(branchInventory);
        }
      }

      // Use findOne method which properly loads relations
      return await this.findOne(savedOrder.id, businessId);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async findAll(businessId: string, branchId?: string) {
    const where: any = { businessId };
    if (branchId) {
      where.branchId = branchId;
    }

    const orders = await this.orderRepository.find({
      where,
      relations: ['table', 'branch', 'items'],
      order: { createdAt: 'DESC' },
    });

    // Manually load payments for all orders
    const orderIds = orders.map(o => o.id);
    const paymentsMap = new Map<string, any[]>();
    if (orderIds.length > 0) {
      const payments = await this.orderPaymentRepository.find({
        where: { orderId: In(orderIds) },
        order: { createdAt: 'ASC' },
      });
      
      payments.forEach(payment => {
        if (!paymentsMap.has(payment.orderId)) {
          paymentsMap.set(payment.orderId, []);
        }
        paymentsMap.get(payment.orderId)!.push(payment);
      });
    }

    // Get item counts for all orders in one query
    const itemCountsMap = new Map<string, number>();
    const itemQuantityMap = new Map<string, number>();
    if (orderIds.length > 0) {
      const itemAggregates = await this.orderItemRepository
        .createQueryBuilder('item')
        .select('item.orderId', 'orderId')
        .addSelect('COUNT(item.id)', 'count')
        .addSelect('COALESCE(SUM(item.quantity), 0)', 'totalQuantity')
        .where('item.orderId IN (:...orderIds)', { orderIds })
        .groupBy('item.orderId')
        .getRawMany();

      itemAggregates.forEach((row: any) => {
        itemCountsMap.set(row.orderId, parseInt(row.count, 10));
        itemQuantityMap.set(row.orderId, Number(row.totalQuantity || 0));
      });
    }

    // Calculate totalCost for each order from items (if not already set) and attach payments
    return orders.map(order => {
      const calculatedTotalCost = (order as any).totalCost || 0;
      const calculatedProfit = Number(order.subtotal || 0) - calculatedTotalCost;
      return {
        ...order,
        payments: paymentsMap.get(order.id) || [],
        itemsCount: itemCountsMap.get(order.id) || 0,
        itemsSold: itemQuantityMap.get(order.id) || 0,
        totalCost: (order as any).totalCost || calculatedTotalCost,
        profit: order.profit !== undefined && order.profit !== null ? order.profit : calculatedProfit,
      };
    });
  }

  async findOne(id: string, businessId: string) {
    const order = await this.orderRepository.findOne({
      where: { id, businessId },
      relations: ['table', 'branch', 'payments'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Always manually load payments to ensure they're included (TypeORM relations can be unreliable)
    const payments = await this.orderPaymentRepository.find({
      where: { orderId: id },
      order: { createdAt: 'ASC' },
    });
    (order as any).payments = payments || [];
    
    console.log(`[FindOne] Order ${id} - Loaded ${payments.length} payments from database`);
    if (payments.length > 0) {
      console.log(`[FindOne] Payment amounts:`, payments.map(p => ({ amount: p.amount, method: p.method, date: p.createdAt })));
    }

    // Manually load items and their relations using QueryBuilder for better control
    const items = await this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.uom', 'uom')
      .leftJoinAndSelect('item.inventoryItem', 'inventoryItem')
      .where('item.orderId = :orderId', { orderId: id })
      .getMany();

    // Manually load baseUoms for inventory items
    const baseUomIds = items
      .map(item => (item as any).inventoryItem?.baseUomId)
      .filter(Boolean);
    const baseUomsMap = new Map<string, Uom>();
    if (baseUomIds.length > 0) {
      const uniqueBaseUomIds = [...new Set(baseUomIds)];
      const uomRepository = this.dataSource.getRepository(Uom);
      const baseUoms = await uomRepository.find({
        where: { id: In(uniqueBaseUomIds) },
      });
      baseUoms.forEach(uom => {
        if (uom && uom.id) {
          baseUomsMap.set(uom.id, uom);
        }
      });
    }

    // Manually load inflowItems for all items
    const itemIds = items.map(item => item.id);
    const inflowItemsMap = new Map<string, any[]>();
    const suppliersMap = new Map<string, Supplier>();
    const branchesMap = new Map<string, Branch>();
    
    if (itemIds.length > 0) {
      // Use leftJoinAndSelect to ensure records are returned even if relations fail
      let inflowItems = await this.orderItemInflowItemRepository
        .createQueryBuilder('itemInflowItem')
        .leftJoinAndSelect('itemInflowItem.inflowItem', 'inflowItem')
        .leftJoinAndSelect('inflowItem.supplier', 'supplier')
        .leftJoinAndSelect('inflowItem.branch', 'branch')
        .leftJoinAndSelect('inflowItem.inflow', 'inflow')
        .leftJoinAndSelect('inflow.supplier', 'inflowSupplier')
        .leftJoinAndSelect('inflow.branch', 'inflowBranch')
        .leftJoinAndSelect('inflowItem.uom', 'uom')
        .where('itemInflowItem.orderItemId IN (:...itemIds)', { itemIds })
        .getMany();
      
      console.log(`[FindOne] Loaded ${inflowItems.length} orderItemInflowItems with relations for ${itemIds.length} order items`);
      
      // Fallback: If relations didn't load (TypeORM sometimes fails with leftJoin), manually load them
      const itemsNeedingLoad = inflowItems.filter(item => !item.inflowItem);
      if (itemsNeedingLoad.length > 0) {
        console.warn(`[FindOne] ${itemsNeedingLoad.length} items missing inflowItem relation, loading manually...`);
        const inflowItemIds = itemsNeedingLoad.map(item => item.inflowItemId);
        const loadedInflowItems = await this.inflowItemRepository.find({
          where: { id: In(inflowItemIds) },
          relations: ['supplier', 'branch', 'inflow', 'inflow.supplier', 'inflow.branch', 'uom'],
        });
        const loadedMap = new Map(loadedInflowItems.map(item => [item.id, item]));
        inflowItems.forEach(item => {
          if (!item.inflowItem && loadedMap.has(item.inflowItemId)) {
            (item as any).inflowItem = loadedMap.get(item.inflowItemId);
          }
        });
        console.log(`[FindOne] Manually loaded ${loadedInflowItems.length} inflowItems`);
      }

      // Group by orderItemId and collect supplier/branch IDs for manual loading
      const supplierIds = new Set<string>();
      const branchIds = new Set<string>();
      
      inflowItems.forEach((itemInflowItem, index) => {
        const orderItemId = itemInflowItem.orderItemId;
        console.log(`[FindOne] Processing OrderItemInflowItem ${index + 1}: orderItemId=${orderItemId}, inflowItemId=${itemInflowItem.inflowItemId}, quantityUsed=${itemInflowItem.quantityUsed}`);
        
        if (!inflowItemsMap.has(orderItemId)) {
          inflowItemsMap.set(orderItemId, []);
        }
        inflowItemsMap.get(orderItemId)!.push(itemInflowItem);
        
        // Collect supplier and branch IDs for manual loading
        // Check item-level first, then fall back to inflow-level
        // Add null check for inflowItem
        if (!itemInflowItem.inflowItem) {
          console.warn(`[FindOne] Warning: itemInflowItem ${itemInflowItem.inflowItemId} has null inflowItem`);
          return;
        }
        
        const itemSupplierId = (itemInflowItem.inflowItem as any).supplierId;
        const itemBranchId = (itemInflowItem.inflowItem as any).branchId;
        const inflowSupplierId = (itemInflowItem.inflowItem?.inflow as any)?.supplierId;
        const inflowBranchId = (itemInflowItem.inflowItem?.inflow as any)?.branchId;
        
        const effectiveSupplierId = itemSupplierId || inflowSupplierId;
        const effectiveBranchId = itemBranchId || inflowBranchId;
        
        console.log(`[FindOne] Collecting IDs for itemInflowItem ${itemInflowItem.inflowItemId}: itemSupplierId=${itemSupplierId}, itemBranchId=${itemBranchId}, inflowSupplierId=${inflowSupplierId}, inflowBranchId=${inflowBranchId}, effectiveSupplierId=${effectiveSupplierId}, effectiveBranchId=${effectiveBranchId}`);
        
        if (effectiveSupplierId) {
          supplierIds.add(effectiveSupplierId);
        }
        
        if (effectiveBranchId) {
          branchIds.add(effectiveBranchId);
        }
      });

      // Manually load suppliers and branches if needed
      const supplierRepository = this.dataSource.getRepository(Supplier);
      const branchRepository = this.dataSource.getRepository(Branch);
      
      const [suppliers, branches] = await Promise.all([
        supplierIds.size > 0 ? supplierRepository.find({
          where: { businessId, id: supplierIds.size === 1 ? Array.from(supplierIds)[0] : In(Array.from(supplierIds)) },
        }) : [],
        branchIds.size > 0 ? branchRepository.find({
          where: { businessId, id: branchIds.size === 1 ? Array.from(branchIds)[0] : In(Array.from(branchIds)) },
        }) : [],
      ]);

      suppliers.forEach(s => suppliersMap.set(s.id, s));
      branches.forEach(b => branchesMap.set(b.id, b));

      console.log(`[FindOne] Loaded ${suppliers.length} suppliers and ${branches.length} branches`);

      // Update inflowItems with manually loaded suppliers and branches
      inflowItems.forEach(itemInflowItem => {
        if (itemInflowItem.inflowItem) {
          // Use item-level supplier/branch if available, otherwise fall back to inflow-level
          // Access properties directly - TypeORM should have loaded them
          const itemSupplierId = (itemInflowItem.inflowItem as any).supplierId;
          const itemBranchId = (itemInflowItem.inflowItem as any).branchId;
          const inflowSupplierId = (itemInflowItem.inflowItem?.inflow as any)?.supplierId;
          const inflowBranchId = (itemInflowItem.inflowItem?.inflow as any)?.branchId;
          
          const effectiveSupplierId = itemSupplierId || inflowSupplierId;
          const effectiveBranchId = itemBranchId || inflowBranchId;
          
          console.log(`[FindOne] Updating inflowItem ${itemInflowItem.inflowItemId}: supplierId=${effectiveSupplierId}, branchId=${effectiveBranchId}`);
          
          // Always set supplier and branch from manually loaded maps if IDs exist
          if (effectiveSupplierId && suppliersMap.has(effectiveSupplierId)) {
            (itemInflowItem.inflowItem as any).supplier = suppliersMap.get(effectiveSupplierId);
            console.log(`[FindOne] Set supplier for inflowItem ${itemInflowItem.inflowItemId}: ${suppliersMap.get(effectiveSupplierId)?.name}`);
          }
          
          if (effectiveBranchId && branchesMap.has(effectiveBranchId)) {
            (itemInflowItem.inflowItem as any).branch = branchesMap.get(effectiveBranchId);
            console.log(`[FindOne] Set branch for inflowItem ${itemInflowItem.inflowItemId}: ${branchesMap.get(effectiveBranchId)?.name}`);
          }
        }
      });
    }

    // Transform order items to include batches format for frontend compatibility
    order.items = items.map((orderItem: any) => {
      // Get inflowItems for this item
      const itemInflowItems = inflowItemsMap.get(orderItem.id) || [];

      console.log(`[FindOne] Order item ${orderItem.id} has ${itemInflowItems.length} inflow items`);

      // Calculate conversion factor from sale UOM to base UOM
      const qty = Number(orderItem.quantity || 0);
      const qtyBase = Number(orderItem.quantityBase || orderItem.quantity || 0);
      const multToBase = qty > 0 ? (qtyBase / qty) : 1.0;

      // Transform inflowItems to batches format expected by frontend
      const batches = itemInflowItems.map((itemInflowItem: any) => {
        const batchQtyBase = Number(itemInflowItem.quantityUsed || 0);
        const batchQtySale = multToBase > 0 ? (batchQtyBase / multToBase) : batchQtyBase;
        const batchSaleValue = batchQtySale * Number(orderItem.unitPrice || 0);
        const batchCostValue = Number(itemInflowItem.totalCost || 0);
        const batchProfit = batchSaleValue - batchCostValue;

        console.log(`[FindOne] Batch data - qty: ${batchQtyBase}, cost: ${batchCostValue}, sale: ${batchSaleValue}, profit: ${batchProfit}`);

        // Get supplier and branch IDs - use item-level first, then fall back to inflow-level
        // Add null check for inflowItem
        if (!itemInflowItem.inflowItem) {
          console.warn(`[FindOne] Warning: itemInflowItem ${itemInflowItem.inflowItemId} has null inflowItem in batch mapping`);
          return {
            inflowItemId: itemInflowItem.inflowItemId,
            quantityUsed: itemInflowItem.quantityUsed,
            quantityUsedSaleUom: batchQtySale,
            costPerUnit: itemInflowItem.costPerUnit,
            costTotal: itemInflowItem.totalCost,
            saleValue: batchSaleValue,
            profit: batchProfit,
            supplier: null,
            branch: null,
            invoiceNumber: null,
            batchNumber: null,
            expiryDate: null,
            receivedAt: null,
            uom: null,
          };
        }
        
        const itemSupplierId = (itemInflowItem.inflowItem as any).supplierId;
        const itemBranchId = (itemInflowItem.inflowItem as any).branchId;
        const inflowSupplierId = (itemInflowItem.inflowItem?.inflow as any)?.supplierId;
        const inflowBranchId = (itemInflowItem.inflowItem?.inflow as any)?.branchId;
        
        const effectiveSupplierId = itemSupplierId || inflowSupplierId;
        const effectiveBranchId = itemBranchId || inflowBranchId;
        
        console.log(`[FindOne] Batch lookup - inflowItemId: ${itemInflowItem.inflowItemId}, supplierId: ${effectiveSupplierId}, branchId: ${effectiveBranchId}, map has supplier: ${suppliersMap.has(effectiveSupplierId || '')}, map has branch: ${branchesMap.has(effectiveBranchId || '')}`);
        
        // Get supplier and branch from manually loaded maps (from the code above)
        const supplier = effectiveSupplierId && suppliersMap.has(effectiveSupplierId)
          ? {
              id: suppliersMap.get(effectiveSupplierId)!.id,
              name: suppliersMap.get(effectiveSupplierId)!.name,
            }
          : null;
        
        const branch = effectiveBranchId && branchesMap.has(effectiveBranchId)
          ? {
              id: branchesMap.get(effectiveBranchId)!.id,
              name: branchesMap.get(effectiveBranchId)!.name,
            }
          : null;
        
        // Get UOM - should be loaded via relation
        const uom = itemInflowItem.inflowItem?.uom ? {
          id: itemInflowItem.inflowItem.uom.id,
          name: itemInflowItem.inflowItem.uom.name,
          abbreviation: itemInflowItem.inflowItem.uom.abbreviation,
        } : null;
        
        return {
          inflowItemId: itemInflowItem.inflowItemId,
          quantityUsed: itemInflowItem.quantityUsed, // Base quantity
          quantityUsedSaleUom: batchQtySale, // Quantity in sale UOM
          costPerUnit: itemInflowItem.costPerUnit,
          costTotal: itemInflowItem.totalCost,
          saleValue: batchSaleValue,
          profit: batchProfit,
          supplier: supplier, // Explicitly preserve supplier as plain object
          branch: branch, // Explicitly preserve branch as plain object
          invoiceNumber: itemInflowItem.inflowItem?.inflow?.invoiceNumber || null,
          batchNumber: itemInflowItem.inflowItem?.batchNumber || null,
          expiryDate: itemInflowItem.inflowItem?.expiryDate || null,
          receivedAt: itemInflowItem.inflowItem?.inflow?.receivedAt || null,
          uom: uom, // UOM from inflow item (extracted as plain object)
        };
      }) || [];

      console.log(`[FindOne] Order item ${orderItem.id} transformed to ${batches.length} batches`);

      return {
        ...orderItem,
        batches: batches || [],
        baseUom: orderItem.inventoryItem?.baseUom || null,
      };
    });

    return order;
  }

  async update(id: string, businessId: string, updateOrderDto: UpdateOrderDto) {
    await this.findOne(id, businessId);
    await this.orderRepository.update({ id }, updateOrderDto);
    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.orderRepository.delete({ id });
  }

  async markAsPaid(id: string, businessId: string, paymentDto: MarkPaidDto) {
    const order = await this.orderRepository.findOne({
      where: { id, businessId },
      relations: ['payments'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const totalAmount = Number(order.totalAmount || 0);
    const paymentMode = paymentDto.paymentMode || 'full';

    // Calculate total paid amount from existing payments
    const existingPayments = order.payments || [];
    const totalPaid = existingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const remainingBalance = totalAmount - totalPaid;

    // Validate payment amount
    const paymentAmount = Number(paymentDto.amount || 0);
    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    // Check for overpayment
    if (paymentMode === 'full') {
      if (paymentAmount > remainingBalance) {
        throw new BadRequestException(`Payment amount (${paymentAmount}) exceeds remaining balance (${remainingBalance})`);
      }
    } else {
      // Partial payment
      if (paymentAmount > remainingBalance) {
        throw new BadRequestException(`Payment amount (${paymentAmount}) exceeds remaining balance (${remainingBalance})`);
      }
    }

    // Create payment record
    const payment = this.orderPaymentRepository.create({
      orderId: order.id,
      amount: paymentAmount,
      method: paymentDto.method,
      paymentMode: paymentMode,
      status: 'completed',
      paidAt: new Date(),
      notes: paymentDto.notes || null,
    });

    const savedPayment = await this.orderPaymentRepository.save(payment);
    console.log(`[markAsPaid] Saved payment with ID: ${savedPayment.id}, amount: ${paymentAmount}, orderId: ${order.id}`);

    // Calculate new total paid
    const newTotalPaid = totalPaid + paymentAmount;

    // Update order status based on payment
    if (newTotalPaid >= totalAmount) {
      // Fully paid
      order.status = 'completed';
    } else {
      // Partially paid
      order.status = 'pending';
    }

    await this.orderRepository.save(order);

    // Manually load payments to ensure they're included
    const payments = await this.orderPaymentRepository.find({
      where: { orderId: id },
      order: { createdAt: 'ASC' },
    });
    
    console.log(`[markAsPaid] Found ${payments.length} payments for order ${id}`);
    
    // Reload order with relations
    const reloadedOrder = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.table', 'table')
      .leftJoinAndSelect('order.branch', 'branch')
      .where('order.id = :id', { id })
      .andWhere('order.businessId = :businessId', { businessId })
      .getOne();
    
    if (!reloadedOrder) {
      throw new NotFoundException('Order not found after payment');
    }
    
    // Manually attach payments to the order object
    (reloadedOrder as any).payments = payments;
    
    console.log(`[markAsPaid] Reloaded order ID: ${id}, payments count: ${payments.length}`);
    if (payments.length > 0) {
      const totalPaymentsAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      console.log(`[markAsPaid] Total payments amount: ${totalPaymentsAmount}`);
    }
    
    return reloadedOrder;
  }
}
