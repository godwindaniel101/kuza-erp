import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentSettlement } from './entities/payment-settlement.entity';
import { TwoFactor } from './entities/two-factor.entity';
import { generateBase32Secret, otpauthUri, verifyTotp } from '../../common/security/totp';
import { Branch } from '../../common/entities/branch.entity';
import { Business } from '../../common/entities/business.entity';
import { Order } from '../rms/entities/order.entity';
import { OrderPayment } from '../rms/entities/order-payment.entity';
import { MonnifyProvider } from './providers/monnify.provider';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { Logger } from '@nestjs/common';

const LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  mobile_money: 'Mobile Money',
};

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly methodRepo: Repository<PaymentMethod>,
    @InjectRepository(PaymentAccount)
    private readonly accountRepo: Repository<PaymentAccount>,
    @InjectRepository(PaymentTransaction)
    private readonly txRepo: Repository<PaymentTransaction>,
    @InjectRepository(PaymentSettlement)
    private readonly settlementRepo: Repository<PaymentSettlement>,
    @InjectRepository(TwoFactor)
    private readonly twoFactorRepo: Repository<TwoFactor>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderPayment)
    private readonly orderPaymentRepo: Repository<OrderPayment>,
    private readonly monnify: MonnifyProvider,
  ) {}

  private readonly logger = new Logger(PaymentsService.name);

  /** Provider config status — the UI shows a banner when unconfigured. */
  providerStatus() {
    return { provider: 'monnify', configured: this.monnify.isConfigured() };
  }

  /** Enable a payment option on a branch. Bank transfer reserves a virtual account. */
  async createMethod(dto: CreatePaymentMethodDto, actor?: { id?: string; name?: string }) {
    const branch = await this.branchRepo.findOne({ where: { id: dto.branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const existing = await this.methodRepo.findOne({
      where: { branchId: dto.branchId, type: dto.type, status: 'active' },
    });
    if (existing) {
      throw new BadRequestException(
        `${LABELS[dto.type] || dto.type} is already enabled for this branch.`,
      );
    }

    // For bank transfer we must be able to reserve an account before saving the
    // method, so a failed provider call doesn't leave a dangling method.
    let accounts: PaymentAccount[] = [];
    const method = this.methodRepo.create({
      branchId: dto.branchId,
      type: dto.type,
      provider: 'monnify',
      label: dto.label || LABELS[dto.type] || dto.type,
      status: 'active',
      config: dto.preferredBanks?.length ? { preferredBanks: dto.preferredBanks } : null,
      createdBy: actor?.id || null,
      createdByName: actor?.name || null,
    });

    if (dto.type === 'bank_transfer') {
      const business = await this.businessRepo.findOne({ where: {} });
      // Account name = "<Business> - <Branch>" so it's recognizable on transfers.
      const accountName = [business?.name, branch.name].filter(Boolean).join(' - ') || 'Kuza';
      // Unique per creation — Monnify rejects a reused reference, and re-adding
      // after archiving would collide with a fixed one. Mapping back to the
      // branch is via the stored accountReference on the account row, so any
      // unique value works.
      const accountReference = `KZ-${dto.branchId.slice(0, 8)}-${Date.now().toString(36)}`;
      // Monnify allows only ONE reserved account per customerEmail, so each
      // account gets a unique synthetic email (derived from the unique reference).
      // We map back to the branch via the stored accountReference, not the email.
      const customerEmail = `${accountReference.toLowerCase()}@kuza-erp.app`;
      const reserved = await this.monnify.createReservedAccount({
        accountReference,
        accountName,
        customerEmail,
        customerName: accountName,
        preferredBanks: dto.preferredBanks,
      });
      const savedMethod = await this.methodRepo.save(method);
      accounts = await this.accountRepo.save(
        reserved.accounts.map((a) =>
          this.accountRepo.create({
            paymentMethodId: savedMethod.id,
            branchId: dto.branchId,
            provider: 'monnify',
            accountReference: reserved.accountReference,
            reservationReference: reserved.reservationReference || null,
            accountNumber: a.accountNumber,
            accountName: a.accountName || null,
            bankName: a.bankName || null,
            bankCode: a.bankCode || null,
            status: 'active',
          }),
        ),
      );
      return { method: savedMethod, accounts };
    }

    // card / mobile_money: no reserved account (their flows come in a later phase).
    const savedMethod = await this.methodRepo.save(method);
    return { method: savedMethod, accounts };
  }

  /** Active (non-archived) methods with their virtual accounts. */
  async listMethods(branchId?: string) {
    const methods = await this.methodRepo.find({
      where: branchId ? { branchId, status: 'active' } : { status: 'active' },
      order: { createdAt: 'DESC' },
    });
    if (methods.length === 0) return [];
    const ids = methods.map((m) => m.id);
    const accounts = await this.accountRepo.find({ where: { paymentMethodId: In(ids) } });
    const byMethod = new Map<string, PaymentAccount[]>();
    accounts.forEach((a) => {
      const list = byMethod.get(a.paymentMethodId) || [];
      list.push(a);
      byMethod.set(a.paymentMethodId, list);
    });
    return methods.map((m) => ({ ...m, accounts: byMethod.get(m.id) || [] }));
  }

  /** Soft-delete: archive the method (and its accounts) — never hard-delete, so
   *  historical transactions keep their references. */
  async removeMethod(id: string) {
    const method = await this.methodRepo.findOne({ where: { id } });
    if (!method) throw new NotFoundException('Payment method not found');
    method.status = 'archived';
    await this.methodRepo.save(method);
    await this.accountRepo.update({ paymentMethodId: id }, { status: 'archived' });
  }

  /** Payment transactions (the Payment module ledger), newest first. */
  async listTransactions(branchId?: string) {
    return this.txRepo.find({
      where: branchId ? { branchId } : {},
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  // ---- POS flow (awaiting → paid via webhook) ---------------------------

  /**
   * Start an "awaiting payment" for a sale via the branch's bank-transfer
   * account. POS shows the returned account + polls the transaction until the
   * webhook flips it to paid.
   */
  async createAwaiting(input: {
    branchId: string;
    orderId?: string;
    amount: number;
    actor?: { id?: string; name?: string };
  }) {
    const method = await this.methodRepo.findOne({
      where: { branchId: input.branchId, type: 'bank_transfer', status: 'active' },
    });
    if (!method) {
      throw new BadRequestException('No bank-transfer payment option is set up for this branch.');
    }
    const account = await this.accountRepo.findOne({
      where: { paymentMethodId: method.id, status: 'active' },
    });

    const paymentReference = `PAY-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    const tx = await this.txRepo.save(
      this.txRepo.create({
        branchId: input.branchId,
        orderId: input.orderId || null,
        paymentMethodId: method.id,
        paymentAccountId: account?.id || null,
        provider: 'monnify',
        paymentReference,
        amount: input.amount,
        currency: 'NGN',
        status: 'awaiting',
        createdBy: input.actor?.id || null,
        createdByName: input.actor?.name || null,
      }),
    );

    return {
      transaction: tx,
      account: account
        ? {
            accountNumber: account.accountNumber,
            bankName: account.bankName,
            accountName: account.accountName,
          }
        : null,
    };
  }

  /** Single transaction — POS polls this until status flips to `paid`. */
  async getTransaction(id: string) {
    const tx = await this.txRepo.findOne({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  /**
   * Monnify webhook: verify signature, then match the transfer to the oldest
   * awaiting sale on that branch with the same amount and mark it paid.
   * Idempotent on providerReference. Always non-throwing except on bad signature
   * so Monnify doesn't retry a legitimately-handled event.
   */
  async handleMonnifyWebhook(rawBody: string, signature?: string) {
    if (!this.monnify.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return { ok: true, ignored: 'unparseable' };
    }
    const event = this.monnify.parseWebhookEvent(body);
    if (!event.isSuccessful) return { ok: true, ignored: 'not-successful' };

    // Idempotency: this provider reference already recorded as paid?
    if (event.transactionReference) {
      const existing = await this.txRepo.findOne({
        where: { providerReference: event.transactionReference },
      });
      if (existing && existing.status === 'paid') return { ok: true, duplicate: true };
    }

    // accountReference → branch.
    let branchId: string | null = null;
    if (event.accountReference) {
      const acct = await this.accountRepo.findOne({
        where: { accountReference: event.accountReference },
      });
      branchId = acct?.branchId || null;
    }

    // Match the oldest awaiting sale on the branch with the same amount.
    let tx: PaymentTransaction | null = null;
    if (branchId) {
      tx = await this.txRepo.findOne({
        where: { branchId, status: 'awaiting', amount: event.amountPaid },
        order: { createdAt: 'ASC' },
      });
    }

    if (tx) {
      tx.status = 'paid';
      tx.providerReference = event.transactionReference || tx.providerReference;
      tx.paidAt = event.paidAt ? new Date(event.paidAt) : new Date();
      tx.rawPayload = body;
      await this.txRepo.save(tx);
      if (tx.orderId) await this.markOrderPaid(tx.orderId, Number(tx.amount));
      return { ok: true, matched: true };
    }

    // Unmatched but attributable to a branch — record it so money is never lost.
    if (branchId) {
      await this.txRepo.save(
        this.txRepo.create({
          branchId,
          provider: 'monnify',
          providerReference: event.transactionReference || null,
          paymentReference: event.paymentReference || `WH-${Date.now()}`,
          amount: event.amountPaid,
          currency: event.currency || 'NGN',
          status: 'paid',
          paidAt: event.paidAt ? new Date(event.paidAt) : new Date(),
          rawPayload: body,
        }),
      );
      return { ok: true, matched: false, recorded: true };
    }

    this.logger.warn(
      `Monnify webhook: no branch for accountReference=${event.accountReference} ref=${event.transactionReference}`,
    );
    return { ok: true, matched: false };
  }

  // ---- 2FA (Google Authenticator / TOTP) --------------------------------

  async get2faStatus(userId: string) {
    const rec = await this.twoFactorRepo.findOne({ where: { userId } });
    return { enabled: !!rec?.enabled };
  }

  /** Begin enrollment: (re)issue a pending secret and the otpauth URI/QR payload. */
  async setup2fa(userId: string, account: string) {
    const secret = generateBase32Secret();
    let rec = await this.twoFactorRepo.findOne({ where: { userId } });
    if (rec) {
      rec.secret = secret;
      rec.enabled = false;
    } else {
      rec = this.twoFactorRepo.create({ userId, secret, enabled: false });
    }
    await this.twoFactorRepo.save(rec);
    return { secret, otpauthUri: otpauthUri(secret, account || 'user') };
  }

  /** Complete enrollment by confirming a code from the authenticator app. */
  async activate2fa(userId: string, code: string) {
    const rec = await this.twoFactorRepo.findOne({ where: { userId } });
    if (!rec) throw new BadRequestException('Start 2FA setup first.');
    if (!verifyTotp(code, rec.secret)) {
      throw new UnauthorizedException('Invalid code. Try again.');
    }
    rec.enabled = true;
    await this.twoFactorRepo.save(rec);
    return { enabled: true };
  }

  private async assertValid2fa(userId: string, code: string) {
    const rec = await this.twoFactorRepo.findOne({ where: { userId } });
    if (!rec || !rec.enabled) {
      throw new BadRequestException('Set up two-factor authentication first.');
    }
    if (!verifyTotp(code, rec.secret)) {
      throw new UnauthorizedException('Invalid 2FA code.');
    }
  }

  // ---- Settlement account (2FA-gated) -----------------------------------

  async getSettlement() {
    const rec = await this.settlementRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    return rec || null;
  }

  /**
   * Set/update where inflows settle. Sensitive — requires a valid TOTP code from
   * the acting user's enrolled authenticator.
   */
  async updateSettlement(
    dto: { bankName?: string; bankCode?: string; accountNumber?: string; accountName?: string; code: string },
    actor: { id?: string; name?: string },
  ) {
    if (!actor?.id) throw new UnauthorizedException('Not authenticated.');
    await this.assertValid2fa(actor.id, dto.code);

    let rec = await this.settlementRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (!rec) rec = this.settlementRepo.create({});
    rec.bankName = dto.bankName || null;
    rec.bankCode = dto.bankCode || null;
    rec.accountNumber = dto.accountNumber || null;
    rec.accountName = dto.accountName || null;
    rec.updatedBy = actor.id || null;
    rec.updatedByName = actor.name || null;
    return this.settlementRepo.save(rec);
  }

  private async markOrderPaid(orderId: string, amount: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) return;
    if (order.status !== 'paid' && order.status !== 'completed') {
      order.status = 'paid';
      await this.orderRepo.save(order);
    }
    await this.orderPaymentRepo.save(
      this.orderPaymentRepo.create({
        orderId,
        amount,
        method: 'transfer',
        paymentMode: 'full',
        status: 'completed',
        paidAt: new Date(),
        notes: 'Auto-confirmed via Monnify transfer',
      }),
    );
  }
}
