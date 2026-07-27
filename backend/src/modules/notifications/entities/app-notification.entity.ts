import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * In-app (in-portal) notification — the bell/inbox feed, distinct from the
 * EMAIL notifications sent by NotificationsService. Tenant-scoped: lives in
 * each tenant schema. `userId === null` means the notification is addressed to
 * every user in the tenant (tenant-wide broadcast).
 */
@Entity('app_notifications')
@Index(['userId'])
@Index(['isRead'])
export class AppNotification extends TenantEntity {
  /** Target user (tenant user id). Null = all users in the tenant. */
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  /** info | order | partnership | invoice | payment | system */
  @Column({ default: 'info' })
  type: string;

  /** In-app route, e.g. /network/orders/<id>. */
  @Column({ type: 'varchar', nullable: true })
  link: string | null;

  @Column({ default: false })
  isRead: boolean;
}
