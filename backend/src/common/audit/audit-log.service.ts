import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { AuditLog } from './audit-log.entity';

export interface AuditLogRecord {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  method: string;
  resource: string;
  resourceId?: string | null;
  statusCode: number;
  changes?: Record<string, any> | null;
  ip?: string | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Persist an audit entry into a specific tenant schema.
   *
   * Uses a schema-qualified raw INSERT rather than the repository because the
   * audit interceptor may run outside the request's tenant transaction (global
   * interceptor ordering), where the connection's search_path cannot be
   * trusted. Never throws — auditing must not fail the request.
   */
  async record(schemaName: string, entry: AuditLogRecord): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO "${schemaName}"."audit_logs"
           (id, created_at, updated_at, user_id, user_email, action, method,
            resource, resource_id, status_code, changes, ip)
         VALUES ($1, NOW(), NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          randomUUID(),
          entry.userId || null,
          entry.userEmail || null,
          entry.action,
          entry.method,
          entry.resource,
          entry.resourceId || null,
          entry.statusCode,
          entry.changes ? JSON.stringify(entry.changes) : null,
          entry.ip || null,
        ],
      );
    } catch (error) {
      // Fire-and-forget: log and move on, never break the request path.
      this.logger.warn(
        `Failed to write audit log for schema ${schemaName}: ${
          (error as Error)?.message
        }`,
      );
    }
  }

  /**
   * Query audit logs for the current tenant (runs inside the request's
   * tenant transaction, so the repository resolves to the tenant schema).
   */
  async findAll(query: {
    page?: number;
    limit?: number;
    userId?: string;
    resource?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.auditLogRepository.createQueryBuilder('log');

    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }
    if (query.resource) {
      qb.andWhere('log.resource = :resource', { resource: query.resource });
    }
    if (query.from) {
      qb.andWhere('log.createdAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('log.createdAt <= :to', { to: new Date(query.to) });
    }

    const [items, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }
}
