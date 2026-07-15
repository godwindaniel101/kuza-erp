/**
 * Global unit-test setup.
 *
 * The money-path services are decorated with `@Transactional()` from
 * `typeorm-transactional`, which at runtime wraps the method in a real DB
 * transaction resolved from a registered DataSource. In isolated unit tests we
 * mock the repositories and never touch a DataSource, so we neutralise the
 * decorator into a pass-through: the original method body runs directly, exactly
 * as it would inside the (here, mocked) transaction. Transaction/rollback
 * behaviour itself is an integration concern and is intentionally out of scope.
 *
 * jest.mock in a setupFile is registered in the module registry before each
 * spec file resolves its imports, so every service under test receives this
 * no-op decorator.
 */
jest.mock('typeorm-transactional', () => ({
  // Method-decorator factory → decorator that returns undefined, leaving the
  // original property descriptor (and therefore the original method) untouched.
  Transactional: () => (): void => undefined,
  // Provide the other commonly-imported symbols as harmless stubs in case a
  // service imports them; they are unused in pure unit tests.
  Propagation: {
    REQUIRED: 'REQUIRED',
    REQUIRES_NEW: 'REQUIRES_NEW',
    NESTED: 'NESTED',
    MANDATORY: 'MANDATORY',
    NEVER: 'NEVER',
    NOT_SUPPORTED: 'NOT_SUPPORTED',
    SUPPORTS: 'SUPPORTS',
  },
  IsolationLevel: {
    READ_UNCOMMITTED: 'READ UNCOMMITTED',
    READ_COMMITTED: 'READ COMMITTED',
    REPEATABLE_READ: 'REPEATABLE READ',
    SERIALIZABLE: 'SERIALIZABLE',
  },
  runInTransaction: async (fn: () => unknown) => fn(),
  initializeTransactionalContext: () => undefined,
  addTransactionalDataSource: (ds: unknown) => ds,
}));
