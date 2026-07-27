import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { createMockRepo, MockRepo } from '../../../../test/repo-mock';

/**
 * Invariants for inventory outflow allocation:
 *  - FIFO / LIFO / FEFO drive the batch ordering used to pick inflow lots;
 *  - allocation consumes lots in order, splitting across lots as needed;
 *  - cost is taken from each lot's receipt unit cost (never the sale price);
 *  - an oversell (demand > available) is BLOCKED with a throw — never clamped.
 */
describe('OrdersService.allocateInventory', () => {
  let service: OrdersService;
  let inflowItemRepo: MockRepo;
  let orderItemInflowItemRepo: MockRepo;
  let businessRepo: MockRepo;

  const BRANCH = 'branch-1';
  const ITEM = 'item-1';

  beforeAll(() => {
    // The service is chatty; keep the test output readable.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    inflowItemRepo = createMockRepo();
    orderItemInflowItemRepo = createMockRepo();
    businessRepo = createMockRepo();

    service = new OrdersService(
      createMockRepo() as any, // orderRepository
      createMockRepo() as any, // orderItemRepository
      createMockRepo() as any, // orderPaymentRepository
      orderItemInflowItemRepo as any, // orderItemInflowItemRepository
      createMockRepo() as any, // inventoryItemRepository
      createMockRepo() as any, // inventoryItemComponentRepository
      inflowItemRepo as any, // inflowItemRepository
      createMockRepo() as any, // branchInventoryRepository
      businessRepo as any, // businessRepository
      { getMultiplier: jest.fn() } as any, // uomConversionsService
      { getRepository: jest.fn() } as any, // dataSource
      { postSale: jest.fn() } as any, // postingService
    );
  });

  /** Configure the two-stage lot lookup (raw id probe + full entity load). */
  function wireLots(lots: any[]) {
    inflowItemRepo.query.mockResolvedValue(lots.map((l) => ({ id: l.id })));
    inflowItemRepo.find.mockResolvedValue(lots);
  }

  /** Configure "already sold" per lot id (defaults to 0). */
  function wireSold(soldById: Record<string, number> = {}) {
    orderItemInflowItemRepo.query.mockImplementation((_q: string, params: any[]) =>
      Promise.resolve([{ total_sold: soldById[params[0]] ?? 0 }]),
    );
  }

  const allocate = (qty: number, method = 'FIFO') =>
    (service as any).allocateInventory(BRANCH, ITEM, qty, method);

  it('FIFO: orders lots oldest-first and splits demand across lots at each lot cost', async () => {
    // Arrange: two lots, 10 @2 (older) then 10 @3 (newer); demand 15.
    wireLots([
      { id: 'b1', baseQuantity: 10, unitCost: 2, createdAt: new Date('2026-01-01') },
      { id: 'b2', baseQuantity: 10, unitCost: 3, createdAt: new Date('2026-02-01') },
    ]);
    wireSold();
    // Act
    const result = await allocate(15, 'FIFO');
    // Assert: consumes all of b1, then 5 of b2.
    expect(result.allocations).toEqual([
      { inflowItemId: 'b1', quantityUsed: 10, costPerUnit: 2, totalCost: 20 },
      { inflowItemId: 'b2', quantityUsed: 5, costPerUnit: 3, totalCost: 15 },
    ]);
    expect(result.costTotal).toBe(35);
    expect(result.costPrice).toBe(Math.round((35 / 15) * 100) / 100);
    // The DB lot query is ordered oldest-first for FIFO.
    expect(inflowItemRepo.query.mock.calls[0][0]).toContain(
      'item.created_at ASC',
    );
    expect(inflowItemRepo.find.mock.calls[0][0].order).toEqual({
      createdAt: 'ASC',
    });
  });

  it('LIFO: lot query and load order are newest-first', async () => {
    // Arrange
    wireLots([
      { id: 'b2', baseQuantity: 10, unitCost: 3, createdAt: new Date('2026-02-01') },
    ]);
    wireSold();
    // Act
    await allocate(5, 'LIFO');
    // Assert
    expect(inflowItemRepo.query.mock.calls[0][0]).toContain(
      'item.created_at DESC',
    );
    expect(inflowItemRepo.find.mock.calls[0][0].order).toEqual({
      createdAt: 'DESC',
    });
  });

  it('FEFO: lot query and load order are earliest-expiry-first', async () => {
    // Arrange
    wireLots([
      {
        id: 'b1',
        baseQuantity: 10,
        unitCost: 2,
        expiryDate: new Date('2026-03-01'),
        createdAt: new Date('2026-01-01'),
      },
    ]);
    wireSold();
    // Act
    await allocate(5, 'FEFO');
    // Assert
    expect(inflowItemRepo.query.mock.calls[0][0]).toContain(
      'item.expiry_date ASC',
    );
    expect(inflowItemRepo.find.mock.calls[0][0].order).toEqual({
      expiryDate: 'ASC',
      createdAt: 'ASC',
    });
  });

  it('uses the LOT receipt cost, not the sale price', async () => {
    // Arrange: single lot at cost 7.25.
    wireLots([
      { id: 'b1', baseQuantity: 4, unitCost: 7.25, createdAt: new Date('2026-01-01') },
    ]);
    wireSold();
    // Act
    const result = await allocate(4, 'FIFO');
    // Assert
    expect(result.allocations[0].costPerUnit).toBe(7.25);
    expect(result.costTotal).toBe(29);
  });

  it('nets prior sales off each lot before allocating', async () => {
    // Arrange: lot of 10, 8 already sold → only 2 available; demand 2 → fine.
    wireLots([
      { id: 'b1', baseQuantity: 10, unitCost: 2, createdAt: new Date('2026-01-01') },
    ]);
    wireSold({ b1: 8 });
    // Act
    const result = await allocate(2, 'FIFO');
    // Assert
    expect(result.allocations).toEqual([
      { inflowItemId: 'b1', quantityUsed: 2, costPerUnit: 2, totalCost: 4 },
    ]);
  });

  it('BLOCKS an oversell (demand exceeds availability) — throws, never clamps', async () => {
    // Arrange: only 10 available, demand 20.
    wireLots([
      { id: 'b1', baseQuantity: 10, unitCost: 2, createdAt: new Date('2026-01-01') },
    ]);
    wireSold();
    // Act / Assert
    await expect(allocate(20, 'FIFO')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('BLOCKS when demand exceeds availability after prior sales', async () => {
    // Arrange: 10 base, 8 sold → 2 available; demand 3.
    wireLots([
      { id: 'b1', baseQuantity: 10, unitCost: 2, createdAt: new Date('2026-01-01') },
    ]);
    wireSold({ b1: 8 });
    await expect(allocate(3, 'FIFO')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when no lots exist for the item in the branch', async () => {
    // Arrange
    wireLots([]);
    wireSold();
    await expect(allocate(1, 'FIFO')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when every lot is fully sold out', async () => {
    // Arrange: lot exists but nothing remains.
    wireLots([
      { id: 'b1', baseQuantity: 10, unitCost: 2, createdAt: new Date('2026-01-01') },
    ]);
    wireSold({ b1: 10 });
    await expect(allocate(1, 'FIFO')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('OrdersService.getAllocationMethod', () => {
  let service: OrdersService;
  let businessRepo: MockRepo;

  beforeEach(() => {
    businessRepo = createMockRepo();
    service = new OrdersService(
      createMockRepo() as any,
      createMockRepo() as any,
      createMockRepo() as any,
      createMockRepo() as any,
      createMockRepo() as any, // inventoryItemRepository
      createMockRepo() as any, // inventoryItemComponentRepository
      createMockRepo() as any,
      createMockRepo() as any,
      businessRepo as any,
      { getMultiplier: jest.fn() } as any,
      { getRepository: jest.fn() } as any,
      { postSale: jest.fn() } as any,
    );
  });

  it('defaults to FIFO when the business has no configured method', async () => {
    businessRepo.findOne.mockResolvedValue(null);
    await expect((service as any).getAllocationMethod()).resolves.toBe('FIFO');
  });

  it('normalises a configured method to upper-case', async () => {
    businessRepo.findOne.mockResolvedValue({ allocationMethod: 'lifo' });
    await expect((service as any).getAllocationMethod()).resolves.toBe('LIFO');
  });

  it('falls back to FIFO for an unrecognised method', async () => {
    businessRepo.findOne.mockResolvedValue({ allocationMethod: 'bogus' });
    await expect((service as any).getAllocationMethod()).resolves.toBe('FIFO');
  });
});

/**
 * fulfil() debits stock and posts the sale. The row is locked FOR UPDATE and the
 * 'pending' status re-checked under that lock so two concurrent fulfils cannot
 * both pass the guard and double-debit stock. The two invariants exercised here:
 *  - a non-'pending' order is a NO-OP: no allocation, no stock deduction, no post;
 *  - a missing order row throws NotFound before any work.
 */
describe('OrdersService.fulfil', () => {
  const ORDER_ID = 'order-1';
  const BRANCH = 'branch-1';

  let service: OrdersService;
  let orderRepo: MockRepo;
  let orderItemRepo: MockRepo;
  let orderItemInflowItemRepo: MockRepo;
  let inventoryItemRepo: MockRepo;
  let branchInventoryRepo: MockRepo;
  let inflowItemRepo: MockRepo;
  let stockMovementRepo: MockRepo;
  let posting: { postSale: jest.Mock };

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    orderRepo = createMockRepo();
    orderItemRepo = createMockRepo();
    orderItemInflowItemRepo = createMockRepo();
    inventoryItemRepo = createMockRepo();
    branchInventoryRepo = createMockRepo();
    inflowItemRepo = createMockRepo();
    stockMovementRepo = createMockRepo();
    posting = { postSale: jest.fn() };

    service = new OrdersService(
      orderRepo as any, // orderRepository
      orderItemRepo as any, // orderItemRepository
      createMockRepo() as any, // orderPaymentRepository
      orderItemInflowItemRepo as any, // orderItemInflowItemRepository
      inventoryItemRepo as any, // inventoryItemRepository
      createMockRepo() as any, // inventoryItemComponentRepository
      inflowItemRepo as any, // inflowItemRepository
      branchInventoryRepo as any, // branchInventoryRepository
      createMockRepo() as any, // businessRepository
      { getMultiplier: jest.fn() } as any, // uomConversionsService
      { getRepository: jest.fn(() => stockMovementRepo) } as any, // dataSource
      posting as any, // postingService
    );
  });

  /**
   * Make the pessimistic-lock query builder resolve to `order`. A self-referential
   * chain is used so `.setLock().where().getOne()` returns our configured getOne
   * (the shared repo-mock builder's chain returns its own internal getOne).
   */
  function wireLockedOrder(order: any) {
    const qb: any = {};
    qb.setLock = jest.fn(() => qb);
    qb.where = jest.fn(() => qb);
    qb.getOne = jest.fn().mockResolvedValue(order);
    orderRepo.createQueryBuilder.mockReturnValue(qb);
  }

  it('idempotent NO-OP for a non-pending order: no allocate/deduct/post, returns via findOne', async () => {
    // Arrange: the locked row is already completed.
    const completed = { id: ORDER_ID, status: 'completed' };
    wireLockedOrder(completed);
    // findOne re-loads the order for the return value.
    orderRepo.findOne.mockResolvedValue(completed);

    // Act
    const result = await service.fulfil(ORDER_ID, BRANCH);

    // Assert: returned via findOne, and NOTHING stock-mutating ran.
    expect(result).toBe(completed);
    // Items are never even loaded — the guard returns before that.
    expect(orderItemRepo.find).not.toHaveBeenCalled();
    // No allocation probe against inflow lots.
    expect(inflowItemRepo.query).not.toHaveBeenCalled();
    expect(inflowItemRepo.find).not.toHaveBeenCalled();
    // No stock deducted from either source of truth.
    expect(inventoryItemRepo.save).not.toHaveBeenCalled();
    expect(branchInventoryRepo.save).not.toHaveBeenCalled();
    expect(orderItemInflowItemRepo.save).not.toHaveBeenCalled();
    expect(stockMovementRepo.save).not.toHaveBeenCalled();
    // No journal entry posted.
    expect(posting.postSale).not.toHaveBeenCalled();
    // The order row itself is not re-saved.
    expect(orderRepo.save).not.toHaveBeenCalled();
  });

  it('throws NotFound when the locked order row does not exist', async () => {
    // Arrange
    wireLockedOrder(null);
    // Act / Assert
    await expect(service.fulfil(ORDER_ID, BRANCH)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // Nothing was touched.
    expect(orderItemRepo.find).not.toHaveBeenCalled();
    expect(posting.postSale).not.toHaveBeenCalled();
  });
});

/**
 * cancelIfPending() declines a PENDING marketplace sale. No stock is moved for a
 * pending sale, so it only flips status → 'cancelled', and is a no-op for a
 * missing or already-progressed order (nothing to reverse).
 */
describe('OrdersService.cancelIfPending', () => {
  let service: OrdersService;
  let orderRepo: MockRepo;

  beforeEach(() => {
    orderRepo = createMockRepo();
    service = new OrdersService(
      orderRepo as any,
      createMockRepo() as any,
      createMockRepo() as any,
      createMockRepo() as any,
      createMockRepo() as any,
      createMockRepo() as any,
      createMockRepo() as any,
      createMockRepo() as any,
      createMockRepo() as any,
      { getMultiplier: jest.fn() } as any,
      { getRepository: jest.fn() } as any,
      { postSale: jest.fn() } as any,
    );
  });

  it('cancels a pending order (status → cancelled, persisted)', async () => {
    const order: any = { id: 'o1', status: 'pending' };
    orderRepo.findOne.mockResolvedValue(order);
    await service.cancelIfPending('o1');
    expect(order.status).toBe('cancelled');
    expect(orderRepo.save).toHaveBeenCalledWith(order);
  });

  it('is a no-op for a non-pending order (nothing to reverse)', async () => {
    orderRepo.findOne.mockResolvedValue({ id: 'o1', status: 'completed' });
    await service.cancelIfPending('o1');
    expect(orderRepo.save).not.toHaveBeenCalled();
  });

  it('is a no-op when the order is missing', async () => {
    orderRepo.findOne.mockResolvedValue(null);
    await service.cancelIfPending('missing');
    expect(orderRepo.save).not.toHaveBeenCalled();
  });
});
