import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AppNotification } from './entities/app-notification.entity';
import { TenantConnectionService } from '../../common/tenant/tenant-connection.service';
import { LandlordService } from '../../common/landlord/services/landlord.service';

export interface AppNotificationInput {
  title: string;
  body?: string | null;
  type?: string;
  link?: string | null;
  userId?: string | null;
}

/**
 * In-app (in-portal) notifications — the bell/inbox feed. Reads/writes for the
 * CURRENT tenant go through the injected repository (tenant search_path is set
 * per request). Cross-tenant writes (notifying another tenant of a network
 * event) go through `deliverToTenant`, which is schema-explicit and
 * best-effort (never throws).
 */
@Injectable()
export class AppNotificationsService {
  private readonly logger = new Logger(AppNotificationsService.name);

  constructor(
    @InjectRepository(AppNotification)
    private readonly repo: Repository<AppNotification>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly landlordService: LandlordService,
  ) {}

  /** Recent notifications for a user (their own + tenant-wide), newest first. */
  async list(userId: string, limit = 50): Promise<AppNotification[]> {
    return this.repo
      .createQueryBuilder('n')
      .where(
        new Brackets((b) => {
          b.where('n.userId IS NULL').orWhere('n.userId = :userId', { userId });
        }),
      )
      .orderBy('n.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /** Count of unread notifications for a user (their own + tenant-wide). */
  async unreadCount(userId: string): Promise<number> {
    return this.repo
      .createQueryBuilder('n')
      .where('n.isRead = :isRead', { isRead: false })
      .andWhere(
        new Brackets((b) => {
          b.where('n.userId IS NULL').orWhere('n.userId = :userId', { userId });
        }),
      )
      .getCount();
  }

  /** Mark a single notification read (current tenant only). */
  async markRead(id: string): Promise<void> {
    await this.repo.update({ id }, { isRead: true });
  }

  /** Mark all of a user's notifications (own + tenant-wide) read. */
  async markAllRead(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(AppNotification)
      .set({ isRead: true })
      .where('user_id IS NULL OR user_id = :userId', { userId })
      .execute();
  }

  /** Create a notification in the CURRENT tenant (current connection). */
  async create(input: AppNotificationInput): Promise<AppNotification> {
    const row = this.repo.create({
      userId: input.userId ?? null,
      title: input.title,
      body: input.body ?? null,
      type: input.type ?? 'info',
      link: input.link ?? null,
      isRead: false,
    });
    return this.repo.save(row);
  }

  /**
   * Deliver a notification into ANOTHER tenant's schema. Resolves the target
   * schema via the landlord, writes through a dedicated schema-explicit
   * QueryRunner, and is best-effort: any failure is logged and swallowed so it
   * can never break the action that triggered it. `userId` defaults to null
   * (tenant-wide).
   */
  async deliverToTenant(
    tenantId: string,
    input: AppNotificationInput,
  ): Promise<void> {
    try {
      const tenant = await this.landlordService.findTenantById(tenantId);
      const qr = this.tenantConnectionService
        .getDefaultConnection()
        .createQueryRunner();
      await qr.connect();
      try {
        await qr.query(`SET search_path TO "${tenant.schemaName}", public`);
        await qr.query(
          `INSERT INTO app_notifications
             (id, user_id, title, body, type, link, is_read, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, now(), now())`,
          [
            input.userId ?? null,
            input.title,
            input.body ?? null,
            input.type ?? 'info',
            input.link ?? null,
          ],
        );
      } finally {
        await qr.query('SET search_path TO public');
        await qr.release();
      }
    } catch (error) {
      this.logger.error(
        `Failed to deliver in-app notification to tenant ${tenantId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
