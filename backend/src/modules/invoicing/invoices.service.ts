import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice-line.entity';
import { InvoicePayment } from './entities/invoice-payment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateInvoiceDto, InvoiceLineDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PostingService } from '../accounting/posting.service';

const round2 = (value: number): number => Math.round(value * 100) / 100;

interface ComputedTotals {
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  lines: Array<InvoiceLineDto & { lineTotal: number }>;
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLine)
    private lineRepository: Repository<InvoiceLine>,
    @InjectRepository(InvoicePayment)
    private paymentRepository: Repository<InvoicePayment>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private readonly postingService: PostingService,
  ) {}

  /**
   * Totals are ALWAYS computed server-side from lines:
   *   lineTotal = quantity * unitPrice - discount
   *   tax per line = lineTotal * taxRate / 100
   */
  private computeTotals(lines: InvoiceLineDto[]): ComputedTotals {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const computedLines = lines.map((line) => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const discount = Number(line.discount || 0);
      const taxRate = Number(line.taxRate || 0);

      const gross = round2(quantity * unitPrice);
      const lineTotal = round2(gross - discount);
      if (lineTotal < 0) {
        throw new BadRequestException(
          `Line "${line.description}": discount cannot exceed the line amount`,
        );
      }

      subtotal = round2(subtotal + gross);
      discountTotal = round2(discountTotal + discount);
      taxTotal = round2(taxTotal + round2((lineTotal * taxRate) / 100));

      return { ...line, taxRate, discount, lineTotal };
    });

    const total = round2(subtotal - discountTotal + taxTotal);
    return { subtotal, taxTotal, discountTotal, total, lines: computedLines };
  }

  /** Sequential per issue-year: INV-2026-0001, INV-2026-0002, ... */
  private async nextInvoiceNumber(issueDate: string): Promise<string> {
    const year = new Date(issueDate).getFullYear();
    const prefix = `INV-${year}-`;

    const last = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    const lastSeq = last
      ? parseInt(last.invoiceNumber.substring(prefix.length), 10) || 0
      : 0;
    return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
  }

  /** Effective status: flags OVERDUE on read when dueDate is past and unpaid. */
  private effectiveStatus(invoice: Invoice): InvoiceStatus {
    if (invoice.status === 'SENT' || invoice.status === 'PARTIALLY_PAID') {
      const today = new Date().toISOString().slice(0, 10);
      if (invoice.dueDate && String(invoice.dueDate) < today) {
        return 'OVERDUE';
      }
    }
    return invoice.status;
  }

  private present(invoice: Invoice) {
    const total = Number(invoice.total);
    const amountPaid = Number(invoice.amountPaid);
    return {
      ...invoice,
      status: this.effectiveStatus(invoice),
      balance: round2(total - amountPaid),
    };
  }

  @Transactional()
  async create(dto: CreateInvoiceDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (String(dto.dueDate) < String(dto.issueDate)) {
      throw new BadRequestException('dueDate cannot be before issueDate');
    }

    const totals = this.computeTotals(dto.lines);
    const invoiceNumber = await this.nextInvoiceNumber(dto.issueDate);

    const invoice = await this.invoiceRepository.save(
      this.invoiceRepository.create({
        invoiceNumber,
        customerId: dto.customerId,
        issueDate: dto.issueDate,
        dueDate: dto.dueDate,
        status: 'DRAFT',
        currency: dto.currency || 'NGN',
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discountTotal: totals.discountTotal,
        total: totals.total,
        amountPaid: 0,
        notes: dto.notes || null,
      }),
    );

    const lines = totals.lines.map((line) =>
      this.lineRepository.create({
        invoiceId: invoice.id,
        itemId: line.itemId || null,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        discount: line.discount,
        lineTotal: line.lineTotal,
      }),
    );
    await this.lineRepository.save(lines);

    return this.findOne(invoice.id);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    customerId?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const today = new Date().toISOString().slice(0, 10);

    // No relation join for customer: relation joins mis-resolve schema under
    // the tenant transaction (F7 quirk). Search matches customers separately;
    // names are batch-loaded after pagination.
    const qb = this.invoiceRepository.createQueryBuilder('invoice');

    if (query.customerId) {
      qb.andWhere('invoice.customerId = :customerId', {
        customerId: query.customerId,
      });
    }
    if (query.search) {
      const matchingCustomers = await this.customerRepository
        .createQueryBuilder('customer')
        .select('customer.id', 'id')
        .where('customer.name ILIKE :search', { search: `%${query.search}%` })
        .getRawMany<{ id: string }>();
      const matchingIds = matchingCustomers.map((c) => c.id);
      if (matchingIds.length > 0) {
        qb.andWhere(
          '(invoice.invoiceNumber ILIKE :search OR invoice.customerId IN (:...matchingIds))',
          { search: `%${query.search}%`, matchingIds },
        );
      } else {
        qb.andWhere('invoice.invoiceNumber ILIKE :search', {
          search: `%${query.search}%`,
        });
      }
    }
    if (query.status) {
      if (query.status === 'OVERDUE') {
        // OVERDUE is computed on read: unpaid and past due.
        qb.andWhere('invoice.status IN (:...unpaid)', {
          unpaid: ['SENT', 'PARTIALLY_PAID'],
        }).andWhere('invoice.dueDate < :today', { today });
      } else {
        qb.andWhere('invoice.status = :status', { status: query.status });
        if (query.status === 'SENT' || query.status === 'PARTIALLY_PAID') {
          // Exclude invoices that present as OVERDUE.
          qb.andWhere('invoice.dueDate >= :today', { today });
        }
      }
    }

    const [rows, total] = await qb
      .orderBy('invoice.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const customerIds = [...new Set(rows.map((r) => r.customerId).filter(Boolean))];
    const customers = customerIds.length
      ? await this.customerRepository.find({ where: { id: In(customerIds) } })
      : [];
    const customerById = new Map(customers.map((c) => [c.id, c]));

    const items = rows.map((invoice) => ({
      ...this.present(invoice),
      customerName: customerById.get(invoice.customerId)?.name || null,
      // Frontend contract expects a customer object on list rows too.
      customer: customerById.get(invoice.customerId)
        ? { name: customerById.get(invoice.customerId)!.name }
        : null,
    }));

    return {
      items,
      total,
      page,
      limit,
      summary: await this.summary(),
    };
  }

  private async summary() {
    const today = new Date().toISOString().slice(0, 10);

    const outstandingRaw = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select(
        'COALESCE(SUM(invoice.total - invoice.amountPaid), 0)',
        'totalOutstanding',
      )
      .where('invoice.status IN (:...unpaid)', {
        unpaid: ['SENT', 'PARTIALLY_PAID'],
      })
      .getRawOne();

    const overdueRaw = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select(
        'COALESCE(SUM(invoice.total - invoice.amountPaid), 0)',
        'totalOverdue',
      )
      .where('invoice.status IN (:...unpaid)', {
        unpaid: ['SENT', 'PARTIALLY_PAID'],
      })
      .andWhere('invoice.dueDate < :today', { today })
      .getRawOne();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const paidRaw = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'paidThisMonth')
      .where('payment.date >= :monthStart', { monthStart })
      .getRawOne();

    return {
      totalOutstanding: Number(outstandingRaw?.totalOutstanding || 0),
      totalOverdue: Number(overdueRaw?.totalOverdue || 0),
      paidThisMonth: Number(paidRaw?.paidThisMonth || 0),
    };
  }

  async findOne(id: string) {
    // Direct queries instead of relation loads (F7 schema-resolution quirk).
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    invoice.lines = await this.lineRepository.find({
      where: { invoiceId: id },
      order: { createdAt: 'ASC' },
    });
    invoice.payments = await this.paymentRepository.find({
      where: { invoiceId: id },
      order: { date: 'ASC', createdAt: 'ASC' },
    });
    invoice.customer = invoice.customerId
      ? await this.customerRepository.findOne({
          where: { id: invoice.customerId },
        })
      : null;
    return this.present(invoice);
  }

  @Transactional()
  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be updated');
    }

    if (dto.customerId && dto.customerId !== invoice.customerId) {
      const customer = await this.customerRepository.findOne({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
      invoice.customerId = dto.customerId;
    }

    if (dto.issueDate) invoice.issueDate = dto.issueDate;
    if (dto.dueDate) invoice.dueDate = dto.dueDate;
    if (String(invoice.dueDate) < String(invoice.issueDate)) {
      throw new BadRequestException('dueDate cannot be before issueDate');
    }
    if (dto.currency) invoice.currency = dto.currency;
    if (dto.notes !== undefined) invoice.notes = dto.notes;

    if (dto.lines) {
      if (dto.lines.length === 0) {
        throw new BadRequestException('Invoice must have at least one line');
      }
      const totals = this.computeTotals(dto.lines);
      await this.lineRepository.delete({ invoiceId: invoice.id });
      await this.lineRepository.save(
        totals.lines.map((line) =>
          this.lineRepository.create({
            invoiceId: invoice.id,
            itemId: line.itemId || null,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
            discount: line.discount,
            lineTotal: line.lineTotal,
          }),
        ),
      );
      invoice.subtotal = totals.subtotal;
      invoice.taxTotal = totals.taxTotal;
      invoice.discountTotal = totals.discountTotal;
      invoice.total = totals.total;
    }

    await this.invoiceRepository.save(invoice);
    return this.findOne(invoice.id);
  }

  @Transactional()
  async send(id: string) {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be sent');
    }
    invoice.status = 'SENT';
    await this.invoiceRepository.save(invoice);
    // Post AR / Revenue / Tax when the invoice is issued. Revenue is net of
    // discounts so AR equals the invoice total. Idempotent per invoice id;
    // same transaction, so status and books commit or roll back together.
    await this.postingService.postInvoiceIssued({
      invoiceId: invoice.id,
      subtotal: round2(Number(invoice.subtotal) - Number(invoice.discountTotal)),
      tax: Number(invoice.taxTotal),
      date: invoice.issueDate,
      memo: `Invoice ${invoice.invoiceNumber} issued`,
    });
    return this.findOne(id);
  }

  @Transactional()
  async recordPayment(id: string, dto: RecordPaymentDto, recordedById?: string) {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status === 'DRAFT') {
      throw new BadRequestException(
        'Invoice must be sent before recording payments',
      );
    }
    if (invoice.status === 'VOID') {
      throw new BadRequestException('Cannot record payment on a VOID invoice');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const amount = round2(Number(dto.amount));
    if (!(amount > 0)) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    const total = Number(invoice.total);
    const amountPaid = Number(invoice.amountPaid);
    if (round2(amountPaid + amount) > total) {
      throw new BadRequestException(
        `Payment exceeds outstanding balance of ${round2(total - amountPaid)}`,
      );
    }

    const payment = await this.paymentRepository.save(
      this.paymentRepository.create({
        invoiceId: invoice.id,
        amount,
        method: dto.method,
        reference: dto.reference || null,
        date: dto.date,
        recordedById: recordedById || null,
      }),
    );

    // Dr Bank / Cr Accounts Receivable — idempotent per payment id.
    await this.postingService.postCustomerPayment({
      paymentId: payment.id,
      amount,
      date: dto.date,
      memo: `Payment on invoice ${invoice.invoiceNumber}`,
    });

    invoice.amountPaid = round2(amountPaid + amount);
    invoice.status = invoice.amountPaid >= total ? 'PAID' : 'PARTIALLY_PAID';
    await this.invoiceRepository.save(invoice);

    return this.findOne(id);
  }

  @Transactional()
  async void(id: string) {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status === 'VOID') {
      throw new BadRequestException('Invoice is already void');
    }
    const paymentCount = await this.paymentRepository.count({
      where: { invoiceId: id },
    });
    if (paymentCount > 0) {
      throw new BadRequestException(
        'Invoices with recorded payments cannot be voided',
      );
    }
    invoice.status = 'VOID';
    await this.invoiceRepository.save(invoice);
    return this.findOne(id);
  }
}
