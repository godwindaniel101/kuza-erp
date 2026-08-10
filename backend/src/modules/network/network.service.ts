import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { NetworkBusiness } from './entities/network-business.entity';
import { TradePartnership } from './entities/trade-partnership.entity';
import { LandlordService } from '../../common/landlord/services/landlord.service';
import { TenantConnectionService } from '../../common/tenant/tenant-connection.service';
import { ConfigService } from '@nestjs/config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestPartnershipDto } from './dto/request-partnership.dto';
import { InviteSupplierDto } from './dto/invite-supplier.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AppNotificationsService } from '../notifications/app-notifications.service';

/**
 * Kuza Network (Phase 0) — landlord-scoped, cross-tenant B2B layer.
 * Contacts/partnerships only; no money moves through this service.
 */
@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  constructor(
    @InjectRepository(NetworkBusiness, 'landlord')
    private readonly networkBusinessRepo: Repository<NetworkBusiness>,
    @InjectRepository(TradePartnership, 'landlord')
    private readonly tradePartnershipRepo: Repository<TradePartnership>,
    private readonly landlordService: LandlordService,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly notificationsService: NotificationsService,
    private readonly appNotifications: AppNotificationsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Find this tenant's network profile, creating a default one from the
   * landlord tenant record on first touch.
   */
  async getOrCreateProfile(tenantId: string): Promise<NetworkBusiness> {
    const existing = await this.networkBusinessRepo.findOne({
      where: { tenantId },
    });
    if (existing) {
      return existing;
    }

    const tenant = await this.landlordService.findTenantById(tenantId);
    const profile = this.networkBusinessRepo.create({
      tenantId,
      name: tenant.name,
      slug: tenant.slug,
      currency: tenant.currency || 'NGN',
      logo: tenant.logo,
      isSupplier: false,
      publicCatalog: false,
      status: 'active',
    });
    return this.networkBusinessRepo.save(profile);
  }

  /**
   * Merge the caller-editable fields onto their network profile.
   */
  async updateProfile(
    tenantId: string,
    dto: UpdateProfileDto,
  ): Promise<NetworkBusiness> {
    const profile = await this.getOrCreateProfile(tenantId);

    if (dto.isSupplier !== undefined) profile.isSupplier = dto.isSupplier;
    if (dto.publicCatalog !== undefined) profile.publicCatalog = dto.publicCatalog;
    if (dto.logo !== undefined) profile.logo = dto.logo;
    if (dto.contactEmail !== undefined) profile.contactEmail = dto.contactEmail;
    if (dto.phone !== undefined) profile.phone = dto.phone;
    if (dto.businessType !== undefined) profile.businessType = dto.businessType;

    return this.networkBusinessRepo.save(profile);
  }

  /**
   * Search the active network directory, excluding the caller's own tenant.
   */
  async searchDirectory(
    tenantId: string,
    opts: { search?: string; supplierOnly?: boolean },
  ): Promise<NetworkBusiness[]> {
    const qb = this.networkBusinessRepo
      .createQueryBuilder('nb')
      .where('nb.status = :status', { status: 'active' })
      .andWhere('nb.tenantId != :tenantId', { tenantId });

    if (opts.supplierOnly) {
      qb.andWhere('nb.isSupplier = :isSupplier', { isSupplier: true });
    }

    if (opts.search) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('nb.name ILIKE :search', {
            search: `%${opts.search}%`,
          }).orWhere('nb.slug ILIKE :search', { search: `%${opts.search}%` });
        }),
      );
    }

    return qb.orderBy('nb.name', 'ASC').take(50).getMany();
  }

  /**
   * List all partnerships this tenant is a party to (as buyer or supplier),
   * annotated with the counterpart profile and the caller's role.
   */
  async listPartnerships(tenantId: string): Promise<
    Array<
      TradePartnership & {
        role: 'buyer' | 'supplier';
        counterpart: { tenantId: string; name: string; slug: string } | null;
      }
    >
  > {
    const partnerships = await this.tradePartnershipRepo
      .createQueryBuilder('tp')
      .where('tp.buyerTenantId = :tenantId', { tenantId })
      .orWhere('tp.supplierTenantId = :tenantId', { tenantId })
      .orderBy('tp.createdAt', 'DESC')
      .getMany();

    const counterpartIds = partnerships.map((p) =>
      p.buyerTenantId === tenantId ? p.supplierTenantId : p.buyerTenantId,
    );

    const profiles = counterpartIds.length
      ? await this.networkBusinessRepo
          .createQueryBuilder('nb')
          .where('nb.tenantId IN (:...ids)', { ids: counterpartIds })
          .getMany()
      : [];
    const profileByTenant = new Map(profiles.map((p) => [p.tenantId, p]));

    return partnerships.map((p) => {
      const role: 'buyer' | 'supplier' =
        p.buyerTenantId === tenantId ? 'buyer' : 'supplier';
      const counterpartTenantId =
        role === 'buyer' ? p.supplierTenantId : p.buyerTenantId;
      const cp = profileByTenant.get(counterpartTenantId);
      return {
        ...p,
        role,
        counterpart: cp
          ? { tenantId: cp.tenantId, name: cp.name, slug: cp.slug }
          : null,
      };
    });
  }

  /**
   * Request (or return an existing) buyer -> supplier partnership. The caller
   * is always the buyer here. The supplier is resolved by explicit tenantId,
   * then slug, then the email of a landlord user. This is the "new customer
   * request" flow — no money.
   */
  async requestPartnership(
    tenantId: string,
    dto: RequestPartnershipDto,
  ): Promise<TradePartnership> {
    const supplierTenantId = await this.resolveSupplierTenantId(dto);

    if (supplierTenantId === tenantId) {
      throw new BadRequestException('Cannot create a partnership with yourself');
    }

    // Ensure both directory profiles exist so the partnership can be annotated.
    const buyerProfile = await this.getOrCreateProfile(tenantId);
    const supplierProfile = await this.getOrCreateProfile(supplierTenantId);

    const existing = await this.tradePartnershipRepo.findOne({
      where: { buyerTenantId: tenantId, supplierTenantId },
    });
    if (existing) {
      return existing;
    }

    const partnership = this.tradePartnershipRepo.create({
      buyerTenantId: tenantId,
      supplierTenantId,
      status: 'pending',
      initiatedBy: 'buyer',
      requestedByEmail: dto.supplierEmail ?? null,
      note: dto.note ?? null,
    });
    const saved = await this.tradePartnershipRepo.save(partnership);

    // In-app notification to the supplier (best-effort, fire-and-forget).
    void this.appNotifications.deliverToTenant(supplierTenantId, {
      title: 'New partnership request',
      body: `${buyerProfile.name} wants to connect with you`,
      type: 'partnership',
      link: '/market?tab=requests',
    });

    // Best-effort: notify the supplier of the new partnership ("new customer")
    // request. Fire-and-forget — never fail the request on a mail error.
    if (supplierProfile.contactEmail) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
      void this.notificationsService
        .sendPartnershipRequest({
          to: supplierProfile.contactEmail,
          context: {
            buyerBusinessName: buyerProfile.name,
            note: dto.note || undefined,
            actionUrl: frontendUrl ? `${frontendUrl}/market?tab=requests` : '',
          },
        })
        .catch(() => undefined);
    }

    return saved;
  }

  private async resolveSupplierTenantId(
    dto: RequestPartnershipDto,
  ): Promise<string> {
    if (dto.supplierTenantId) {
      return dto.supplierTenantId;
    }
    if (dto.supplierSlug) {
      const tenant = await this.landlordService.findTenantBySlug(
        dto.supplierSlug,
      );
      return tenant.id;
    }
    if (dto.supplierEmail) {
      const user = await this.landlordService.findUserByEmail(dto.supplierEmail);
      if (!user) {
        throw new NotFoundException(
          `No business found for ${dto.supplierEmail} — use /network/invite to invite them to the platform instead.`,
        );
      }
      return user.tenantId;
    }
    throw new BadRequestException(
      'Provide one of supplierTenantId, supplierSlug or supplierEmail',
    );
  }

  /**
   * The supplier accepts/rejects a pending partnership. On accept, the buyer
   * is materialized as a Customer inside the supplier's tenant schema.
   */
  async respondToPartnership(
    tenantId: string,
    id: string,
    accept: boolean,
  ): Promise<TradePartnership> {
    const partnership = await this.tradePartnershipRepo.findOne({
      where: { id },
    });
    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }
    if (partnership.supplierTenantId !== tenantId) {
      throw new BadRequestException(
        'Only the supplier can respond to this partnership request',
      );
    }

    partnership.status = accept ? 'active' : 'rejected';
    partnership.respondedAt = new Date();
    const saved = await this.tradePartnershipRepo.save(partnership);

    if (accept) {
      await this.materializeBuyerAsCustomer(partnership);
    }

    return saved;
  }

  /**
   * Materialize the buyer as a Customer row inside the supplier's tenant
   * schema. Written via a dedicated, schema-explicit QueryRunner and made
   * idempotent by linked_tenant_id. Defensive: failures are logged and never
   * fail the accept.
   */
  private async materializeBuyerAsCustomer(
    partnership: TradePartnership,
  ): Promise<void> {
    try {
      const buyer = await this.landlordService.findTenantById(
        partnership.buyerTenantId,
      );
      const supplier = await this.landlordService.findTenantById(
        partnership.supplierTenantId,
      );
      const qr = this.tenantConnectionService
        .getDefaultConnection()
        .createQueryRunner();
      await qr.connect();
      try {
        await qr.query(`SET search_path TO "${supplier.schemaName}", public`);
        const existing = await qr.query(
          'SELECT id FROM customers WHERE linked_tenant_id = $1 LIMIT 1',
          [buyer.id],
        );
        if (!existing.length) {
          await qr.query(
            'INSERT INTO customers (id, name, linked_tenant_id, is_active, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, true, now(), now())',
            [buyer.name, buyer.id],
          );
        }
      } finally {
        await qr.query('SET search_path TO public');
        await qr.release();
      }
    } catch (error) {
      this.logger.error(
        `Failed to materialize buyer ${partnership.buyerTenantId} as customer in supplier ${partnership.supplierTenantId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  /**
   * Invite a supplier by email. If they are already on the platform, this
   * turns into a partnership request; otherwise a signup invite is queued.
   */
  async invite(
    tenantId: string,
    dto: InviteSupplierDto,
  ): Promise<
    | { alreadyOnPlatform: true; partnership: TradePartnership }
    | { alreadyOnPlatform: false; invited: true }
  > {
    const user = await this.landlordService.findUserByEmail(dto.email);
    if (user) {
      const partnership = await this.requestPartnership(tenantId, {
        supplierEmail: dto.email,
        note: dto.note,
      });
      return { alreadyOnPlatform: true, partnership };
    }

    // Off-platform: email them an invite to join Kuza (best-effort).
    const buyerProfile = await this.getOrCreateProfile(tenantId);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    void this.notificationsService
      .sendSupplierInvite({
        to: dto.email,
        context: {
          inviterBusinessName: buyerProfile.name,
          inviteUrl: frontendUrl ? `${frontendUrl}/register` : '',
          note: dto.note || undefined,
        },
      })
      .catch(() => undefined);
    return { alreadyOnPlatform: false, invited: true };
  }
}
