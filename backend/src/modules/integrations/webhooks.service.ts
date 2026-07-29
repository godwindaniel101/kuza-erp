import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConnection } from './entities/integration-connection.entity';
import {
  IntegrationEvent,
  IntegrationEventStatus,
} from './entities/integration-event.entity';
import { Invoice } from '../invoicing/entities/invoice.entity';
import { InvoicesService } from '../invoicing/invoices.service';
import { ConnectionsService } from './connections.service';
import { NormalizedPaymentEvent } from './ports/payment-provider.port';

/**
 * The auto-reconciliation flow: provider webhook -> normalized payment ->
 * invoice matched by reference -> InvoicesService.recordPayment (which
 * auto-posts Dr Bank / Cr AR to the books) -> event marked PROCESSED.
 *
 * Runs INSIDE the tenant transaction established by WebhookTenantGuard +
 * TenantTransactionInterceptor, so all repositories here resolve to the
 * webhook's tenant schema.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(IntegrationConnection)
    private readonly connectionRepository: Repository<IntegrationConnection>,
    @InjectRepository(IntegrationEvent)
    private readonly eventRepository: Repository<IntegrationEvent>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly invoicesService: InvoicesService,
    private readonly connectionsService: ConnectionsService,
  ) {}

  async handleWebhook(
    connectionId: string,
    headers: Record<string, any>,
    body: any,
    rawBody: string,
  ) {
    const connection = await this.connectionRepository.findOne({
      where: { id: connectionId },
    });
    if (!connection) {
      // Landlord route existed but tenant row is gone — treat as unknown.
      throw new NotFoundException('Unknown webhook endpoint');
    }

    if (connection.status !== 'ACTIVE') {
      return this.recordEvent(connection, body, null, 'IGNORED', 'Connection is disabled');
    }

    // Normalize via the provider adapter. Signature failures must 401 so
    // the provider knows delivery was rejected; anything else that cannot
    // be parsed is stored as IGNORED for later inspection.
    let normalized: NormalizedPaymentEvent | null = null;
    try {
      const adapter = this.connectionsService.paymentAdapterFor(
        connection.provider,
      );
      normalized = adapter.parseWebhook(
        headers,
        rawBody,
        connection.config || {},
        connection.webhookSecret,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        // Do NOT persist unauthenticated payloads as trusted events.
        this.logger.warn(
          `Rejected webhook for connection ${connectionId}: ${error.message}`,
        );
        throw error;
      }
      return this.recordEvent(
        connection,
        body,
        null,
        'FAILED',
        `Adapter error: ${error?.message}`,
      );
    }

    if (!normalized) {
      return this.recordEvent(
        connection,
        body,
        null,
        'IGNORED',
        'Event type not handled',
      );
    }

    // Idempotency: providers retry deliveries. If we already processed this
    // reference on this connection, acknowledge without paying twice.
    const duplicate = await this.eventRepository.findOne({
      where: {
        connectionId: connection.id,
        reference: normalized.reference,
        status: 'PROCESSED',
      },
    });
    if (duplicate) {
      return this.recordEvent(
        connection,
        body,
        normalized,
        'IGNORED',
        `Duplicate delivery — already processed as event ${duplicate.id}`,
      );
    }

    // Match reference -> invoice number (exact, case-insensitive).
    const invoice = normalized.reference
      ? await this.invoiceRepository
          .createQueryBuilder('invoice')
          .where('LOWER(invoice.invoiceNumber) = LOWER(:ref)', {
            ref: normalized.reference,
          })
          .getOne()
      : null;

    if (!invoice) {
      return this.recordEvent(
        connection,
        body,
        normalized,
        'IGNORED',
        `No invoice matches reference '${normalized.reference}'`,
      );
    }

    try {
      await this.invoicesService.recordPayment(invoice.id, {
        amount: normalized.amount,
        method: 'BANK_TRANSFER',
        reference: `${connection.provider}:${normalized.reference}`,
        date: (normalized.paidAt || new Date().toISOString()).slice(0, 10),
      });
      return this.recordEvent(connection, body, normalized, 'PROCESSED', null, {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      });
    } catch (error) {
      // Business rejection (already paid, overpayment, VOID...). The event
      // is kept as FAILED with the reason; we still ACK with 200 so the
      // provider does not retry a payload that will never succeed.
      return this.recordEvent(
        connection,
        body,
        normalized,
        'FAILED',
        error?.message || 'Failed to record payment',
      );
    }
  }

  private async recordEvent(
    connection: IntegrationConnection,
    payload: any,
    normalized: NormalizedPaymentEvent | null,
    status: IntegrationEventStatus,
    error: string | null,
    extra?: Record<string, any>,
  ) {
    const event = await this.eventRepository.save(
      this.eventRepository.create({
        connectionId: connection.id,
        provider: connection.provider,
        eventType: normalized?.eventType || payload?.event || payload?.eventType || 'unknown',
        reference: normalized?.reference || null,
        payload: payload && typeof payload === 'object' ? payload : { raw: String(payload) },
        status,
        error,
        processedAt: status === 'PROCESSED' ? new Date() : null,
      }),
    );

    return {
      eventId: event.id,
      status: event.status,
      ...(error ? { detail: error } : {}),
      ...(extra || {}),
    };
  }
}
