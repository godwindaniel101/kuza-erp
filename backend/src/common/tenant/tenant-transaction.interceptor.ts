import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { runInTransaction } from 'typeorm-transactional';
import { Observable, from, lastValueFrom } from 'rxjs';

/**
 * Pins a single database connection per authenticated request and scopes it to
 * the caller's tenant schema.
 *
 * Why this exists: tenant isolation was previously implemented by issuing
 * `SET search_path` on the shared connection pool. Because TypeORM hands out an
 * arbitrary pooled connection per query, the schema set by the guard and the
 * query run by the controller could land on different physical connections —
 * causing reads to silently fall through to the `public` schema and, under
 * concurrency, leak across tenants.
 *
 * By running the whole request inside a transaction (via typeorm-transactional's
 * AsyncLocalStorage context), every repository call in the request reuses one
 * connection. We set `SET LOCAL search_path` on that connection, which is scoped
 * to the transaction and automatically reset when it commits/rolls back — so no
 * tenant schema ever leaks back into the pool.
 *
 * Public routes (login/register) never reach here with a resolved tenant, so
 * they keep their existing inline schema handling.
 */
@Injectable()
export class TenantTransactionInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const schemaName: string | undefined = request?.tenant?.schemaName;

    // No tenant context (public route, or unauthenticated) → no wrapping.
    if (!schemaName) {
      return next.handle();
    }

    // Defense in depth: schemaName is interpolated into SET LOCAL search_path
    // below. It comes from our own landlord table (never user input), but we
    // still validate its shape to guarantee no malformed value can ever be
    // spliced into raw SQL. Mirrors MenuSiteTenantGuard's validation.
    if (!/^[A-Za-z0-9_]+$/.test(schemaName)) {
      return next.handle();
    }

    return from(
      runInTransaction(async () => {
        // SET LOCAL keeps the search_path scoped to this transaction's
        // connection and resets it automatically on commit/rollback.
        await this.dataSource.manager.query(
          `SET LOCAL search_path TO "${schemaName}", public`,
        );
        return lastValueFrom(next.handle());
      }),
    );
  }
}
