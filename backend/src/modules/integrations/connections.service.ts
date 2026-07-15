import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationEvent } from './entities/integration-event.entity';
import { LandlordWebhookRoute } from './entities/landlord-webhook-route.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { PaystackAdapter } from './adapters/paystack.adapter';
import { MonnifyAdapter } from './adapters/monnify.adapter';
import { PaymentProviderPort } from './ports/payment-provider.port';

const SECRETISH_KEY = /secret|key|token/i;

@Injectable()
export class ConnectionsService {
  constructor(
    @InjectRepository(IntegrationConnection)
    private readonly connectionRepository: Repository<IntegrationConnection>,
    @InjectRepository(IntegrationEvent)
    private readonly eventRepository: Repository<IntegrationEvent>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    // Landlord (public DB) connection — reachable without tenant context.
    @InjectRepository(LandlordWebhookRoute, 'landlord')
    private readonly routeRepository: Repository<LandlordWebhookRoute>,
    private readonly paystackAdapter: PaystackAdapter,
    private readonly monnifyAdapter: MonnifyAdapter,
  ) {}

  paymentAdapterFor(provider: string): PaymentProviderPort {
    switch (provider) {
      case 'paystack':
        return this.paystackAdapter;
      case 'monnify':
        return this.monnifyAdapter;
      default:
        throw new BadRequestException(
          `No payment adapter registered for provider '${provider}'`,
        );
    }
  }

  /** Redact secret-ish config values before anything leaves the API. */
  private redactConfig(config: Record<string, any> | null | undefined) {
    if (!config || typeof config !== 'object') return {};
    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(config)) {
      if (SECRETISH_KEY.test(key)) {
        redacted[key] = value ? '••• configured •••' : value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        redacted[key] = this.redactConfig(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  private present(connection: IntegrationConnection) {
    const { webhookSecret, config, ...rest } = connection;
    return {
      ...rest,
      config: this.redactConfig(config),
      webhookPath: `/api/integrations/webhooks/${connection.id}`,
    };
  }

  /**
   * Creates the tenant-scoped connection, then registers the landlord-side
   * webhook route (connectionId -> tenant) so unauthenticated webhooks can
   * find their way back to this schema. The landlord write is on a separate
   * connection (not atomic with the tenant transaction), so on failure we
   * compensate by deleting the connection.
   */
  async create(
    dto: CreateConnectionDto,
    tenant: { id: string; schemaName: string },
  ) {
    if (!tenant?.id || !tenant?.schemaName) {
      throw new BadRequestException('Tenant context is required');
    }

    const connection = await this.connectionRepository.save(
      this.connectionRepository.create({
        provider: dto.provider,
        type: dto.type,
        label: dto.label,
        status: 'ACTIVE',
        config: dto.config || {},
        webhookSecret: randomUUID(),
      }),
    );

    try {
      await this.routeRepository.save(
        this.routeRepository.create({
          connectionId: connection.id,
          tenantId: tenant.id,
          schemaName: tenant.schemaName,
          provider: dto.provider,
        }),
      );
    } catch (error) {
      await this.connectionRepository.delete({ id: connection.id });
      throw new BadRequestException(
        `Could not register webhook route: ${error?.message}`,
      );
    }

    // webhookSecret is returned ONCE, at creation, so the owner can paste it
    // into provider dashboards that support a shared secret. Never again.
    return {
      ...this.present(connection),
      webhookSecret: connection.webhookSecret,
    };
  }

  async findAll() {
    const connections = await this.connectionRepository.find({
      order: { createdAt: 'DESC' },
    });
    return connections.map((c) => this.present(c));
  }

  async findOne(id: string) {
    const connection = await this.connectionRepository.findOne({
      where: { id },
    });
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }
    return this.present(connection);
  }

  async update(id: string, dto: UpdateConnectionDto) {
    const connection = await this.connectionRepository.findOne({
      where: { id },
    });
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }

    if (dto.label !== undefined) connection.label = dto.label;
    if (dto.status !== undefined) connection.status = dto.status;
    if (dto.config !== undefined) {
      // Merge key-by-key so a dashboard can update one credential without
      // resending (and us re-storing) redacted placeholders for the others.
      const merged = { ...(connection.config || {}) };
      for (const [key, value] of Object.entries(dto.config)) {
        if (value === null) {
          delete merged[key];
        } else {
          merged[key] = value;
        }
      }
      connection.config = merged;
    }

    await this.connectionRepository.save(connection);
    return this.present(connection);
  }

  async remove(id: string) {
    const connection = await this.connectionRepository.findOne({
      where: { id },
    });
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }
    // Remove the landlord route first so the public webhook URL dies with
    // the connection even if the tenant-side delete rolls back.
    await this.routeRepository.delete({ connectionId: id });
    await this.connectionRepository.delete({ id });
    return { deleted: true };
  }

  async createVirtualAccount(connectionId: string, customerId: string) {
    const connection = await this.connectionRepository.findOne({
      where: { id: connectionId },
    });
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }
    if (connection.status !== 'ACTIVE') {
      throw new BadRequestException('Integration connection is disabled');
    }

    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const adapter = this.paymentAdapterFor(connection.provider);
    const account = await adapter.createVirtualAccount(
      {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email || null,
        customerPhone: customer.phone || null,
      },
      connection.config || {},
    );

    // Persist on the connection config so the account can be shown again
    // without another provider call. Stored under a non-secret key.
    const config = { ...(connection.config || {}) };
    config.virtualAccounts = {
      ...(config.virtualAccounts || {}),
      [customerId]: {
        provider: account.provider,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        reference: account.reference || null,
        createdAt: new Date().toISOString(),
      },
    };
    connection.config = config;
    await this.connectionRepository.save(connection);

    return {
      customerId,
      provider: account.provider,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      reference: account.reference || null,
    };
  }

  /** Paginated append-only event inbox, for debugging integrations. */
  async listEvents(query: {
    connectionId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.eventRepository.createQueryBuilder('event');
    if (query.connectionId) {
      qb.andWhere('event.connectionId = :connectionId', {
        connectionId: query.connectionId,
      });
    }
    if (query.status) {
      qb.andWhere('event.status = :status', { status: query.status });
    }

    const [items, total] = await qb
      .orderBy('event.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }
}
