/**
 * Lightweight TypeORM Repository / QueryBuilder test doubles.
 *
 * These are deliberately dumb: every method is a jest.fn the individual test
 * configures. `create` defaults to an identity function (returns the entity
 * literal it is given) so tests can inspect exactly what a service tried to
 * persist by reading `save.mock.calls`.
 */

export type MockRepo = {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  count: jest.Mock;
  remove: jest.Mock;
  delete: jest.Mock;
  update: jest.Mock;
  query: jest.Mock;
  createQueryBuilder: jest.Mock;
};

export function createMockRepo(): MockRepo {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    save: jest.fn((entity) => Promise.resolve(entity)),
    // Mirror TypeORM: create(dto) returns a plain object carrying the same fields.
    create: jest.fn((dto) => ({ ...dto })),
    count: jest.fn().mockResolvedValue(0),
    remove: jest.fn((entity) => Promise.resolve(entity)),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    query: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
  };
}

export type MockQueryBuilder = {
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  groupBy: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  innerJoin: jest.Mock;
  setLock: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getOne: jest.Mock;
  getMany: jest.Mock;
  getRawOne: jest.Mock;
  getRawMany: jest.Mock;
  getManyAndCount: jest.Mock;
};

/** A chainable query-builder stub. Terminal getters resolve to empty defaults. */
export function createMockQueryBuilder(
  overrides: Partial<MockQueryBuilder> = {},
): MockQueryBuilder {
  const qb: Partial<MockQueryBuilder> = {};
  const chain = jest.fn(() => qb as MockQueryBuilder);
  qb.select = chain;
  qb.addSelect = chain;
  qb.where = chain;
  qb.andWhere = chain;
  qb.orderBy = chain;
  qb.addOrderBy = chain;
  qb.groupBy = chain;
  qb.leftJoinAndSelect = chain;
  qb.innerJoin = chain;
  qb.setLock = chain;
  qb.skip = chain;
  qb.take = chain;
  qb.getOne = jest.fn().mockResolvedValue(null);
  qb.getMany = jest.fn().mockResolvedValue([]);
  qb.getRawOne = jest.fn().mockResolvedValue(undefined);
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  return { ...(qb as MockQueryBuilder), ...overrides };
}
