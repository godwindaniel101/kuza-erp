import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PostingService } from '../accounting/posting.service';
import { createMockRepo, MockRepo } from '../../../test/repo-mock';

/**
 * Invariants: totals are always computed server-side, recording a payment posts
 * Dr Bank / Cr Accounts Receivable to the ledger, issuing an invoice posts
 * AR / Revenue (net of discount) / Tax, and payment state transitions are
 * guarded (no payment on DRAFT/VOID/PAID, no overpayment).
 */
describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoiceRepo: MockRepo;
  let lineRepo: MockRepo;
  let paymentRepo: MockRepo;
  let customerRepo: MockRepo;
  let posting: {
    postInvoiceIssued: jest.Mock;
    postCustomerPayment: jest.Mock;
  };

  beforeEach(() => {
    invoiceRepo = createMockRepo();
    lineRepo = createMockRepo();
    paymentRepo = createMockRepo();
    customerRepo = createMockRepo();
    posting = {
      postInvoiceIssued: jest.fn().mockResolvedValue({ id: 'je-inv' }),
      postCustomerPayment: jest.fn().mockResolvedValue({ id: 'je-pay' }),
    };
    const invoiceSettings = { getOrCreate: jest.fn().mockResolvedValue({}) };
    const notifications = { sendInvoiceEmail: jest.fn().mockResolvedValue({ success: true }) };
    const config = { get: jest.fn().mockReturnValue('') };

    service = new InvoicesService(
      invoiceRepo as any,
      lineRepo as any,
      paymentRepo as any,
      customerRepo as any,
      posting as unknown as PostingService,
      invoiceSettings as any,
      notifications as any,
      config as any,
    );

    // Default findOne wiring so the trailing re-load never crashes.
    lineRepo.find.mockResolvedValue([]);
    paymentRepo.find.mockResolvedValue([]);
    customerRepo.findOne.mockResolvedValue({ id: 'c1', name: 'Acme' });
  });

  describe('computeTotals (server-side money math)', () => {
    it('computes lineTotal = qty*price - discount, tax per line, and grand total', () => {
      // Arrange
      const lines = [
        { description: 'A', quantity: 2, unitPrice: 100, discount: 0, taxRate: 10 },
        { description: 'B', quantity: 1, unitPrice: 50, discount: 10, taxRate: 0 },
      ];
      // Act
      const totals = (service as any).computeTotals(lines);
      // Assert
      // subtotal = 200 + 50 = 250 (gross, before discount)
      expect(totals.subtotal).toBe(250);
      expect(totals.discountTotal).toBe(10);
      // tax: line A (200*10%)=20 ; line B ((50-10)*0%)=0
      expect(totals.taxTotal).toBe(20);
      // total = subtotal - discount + tax = 250 - 10 + 20 = 260
      expect(totals.total).toBe(260);
    });

    it('rejects a line whose discount exceeds the line amount', () => {
      const lines = [
        { description: 'X', quantity: 1, unitPrice: 100, discount: 150, taxRate: 0 },
      ];
      expect(() => (service as any).computeTotals(lines)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    it('persists an invoice with server-computed totals (ignores any client-sent total)', async () => {
      // Arrange
      customerRepo.findOne.mockResolvedValue({ id: 'c1', name: 'Acme' });
      invoiceRepo.save.mockImplementation((e: any) => {
        e.id = 'inv-1';
        return Promise.resolve(e);
      });
      invoiceRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        total: 220,
        amountPaid: 0,
        status: 'DRAFT',
        customerId: 'c1',
      });
      const dto = {
        customerId: 'c1',
        issueDate: '2026-07-01',
        dueDate: '2026-07-31',
        lines: [
          { description: 'A', quantity: 2, unitPrice: 100, discount: 0, taxRate: 10 },
        ],
      };
      // Act
      await service.create(dto as any);
      // Assert
      const saved = invoiceRepo.save.mock.calls[0][0];
      expect(saved.subtotal).toBe(200);
      expect(saved.taxTotal).toBe(20);
      expect(saved.total).toBe(220);
      expect(saved.status).toBe('DRAFT');
      expect(saved.amountPaid).toBe(0);
    });

    it('rejects a missing customer', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({
          customerId: 'nope',
          issueDate: '2026-07-01',
          dueDate: '2026-07-31',
          lines: [
            { description: 'A', quantity: 1, unitPrice: 100, discount: 0, taxRate: 0 },
          ],
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a dueDate before the issueDate', async () => {
      customerRepo.findOne.mockResolvedValue({ id: 'c1', name: 'Acme' });
      await expect(
        service.create({
          customerId: 'c1',
          issueDate: '2026-07-31',
          dueDate: '2026-07-01',
          lines: [
            { description: 'A', quantity: 1, unitPrice: 100, discount: 0, taxRate: 0 },
          ],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('send', () => {
    it('posts AR / Revenue (net of discount) / Tax and flips status to SENT', async () => {
      // Arrange
      const invoice: any = {
        id: 'inv-1',
        status: 'DRAFT',
        invoiceNumber: 'INV-2026-0001',
        subtotal: 100,
        discountTotal: 20,
        taxTotal: 6,
        issueDate: '2026-07-01',
      };
      invoiceRepo.findOne.mockResolvedValue(invoice);
      // Act
      await service.send('inv-1');
      // Assert
      expect(invoice.status).toBe('SENT');
      expect(posting.postInvoiceIssued).toHaveBeenCalledTimes(1);
      const arg = posting.postInvoiceIssued.mock.calls[0][0];
      expect(arg.invoiceId).toBe('inv-1');
      expect(arg.subtotal).toBe(80); // 100 - 20 discount → revenue net
      expect(arg.tax).toBe(6);
    });

    it('refuses to send a non-DRAFT invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue({ id: 'inv-1', status: 'SENT' });
      await expect(service.send('inv-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(posting.postInvoiceIssued).not.toHaveBeenCalled();
    });
  });

  describe('recordPayment', () => {
    function sentInvoice(overrides: Partial<any> = {}) {
      return {
        id: 'inv-1',
        status: 'SENT',
        invoiceNumber: 'INV-2026-0001',
        total: 100,
        amountPaid: 0,
        ...overrides,
      };
    }

    it('posts Dr Bank / Cr Accounts Receivable via postCustomerPayment', async () => {
      // Arrange
      const invoice = sentInvoice();
      invoiceRepo.findOne.mockResolvedValue(invoice);
      paymentRepo.save.mockImplementation((p: any) => {
        p.id = 'pay-1';
        return Promise.resolve(p);
      });
      // Act
      await service.recordPayment(
        'inv-1',
        { amount: 100, method: 'bank_transfer', date: '2026-07-10' } as any,
        'user-1',
      );
      // Assert: ledger posting happened with the payment id + amount.
      expect(posting.postCustomerPayment).toHaveBeenCalledTimes(1);
      const arg = posting.postCustomerPayment.mock.calls[0][0];
      expect(arg.paymentId).toBe('pay-1');
      expect(arg.amount).toBe(100);
      // Invoice is now fully paid.
      expect(invoice.amountPaid).toBe(100);
      expect(invoice.status).toBe('PAID');
    });

    it('marks PARTIALLY_PAID when the payment is less than the balance', async () => {
      const invoice = sentInvoice();
      invoiceRepo.findOne.mockResolvedValue(invoice);
      paymentRepo.save.mockImplementation((p: any) => {
        p.id = 'pay-1';
        return Promise.resolve(p);
      });
      await service.recordPayment(
        'inv-1',
        { amount: 40, method: 'cash', date: '2026-07-10' } as any,
      );
      expect(invoice.amountPaid).toBe(40);
      expect(invoice.status).toBe('PARTIALLY_PAID');
    });

    it('rejects payment on a DRAFT invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue(sentInvoice({ status: 'DRAFT' }));
      await expect(
        service.recordPayment(
          'inv-1',
          { amount: 10, method: 'cash', date: '2026-07-10' } as any,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(posting.postCustomerPayment).not.toHaveBeenCalled();
    });

    it('rejects payment on a VOID invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue(sentInvoice({ status: 'VOID' }));
      await expect(
        service.recordPayment(
          'inv-1',
          { amount: 10, method: 'cash', date: '2026-07-10' } as any,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects payment on an already PAID invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue(
        sentInvoice({ status: 'PAID', amountPaid: 100 }),
      );
      await expect(
        service.recordPayment(
          'inv-1',
          { amount: 10, method: 'cash', date: '2026-07-10' } as any,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an overpayment beyond the outstanding balance', async () => {
      invoiceRepo.findOne.mockResolvedValue(
        sentInvoice({ amountPaid: 80, total: 100 }),
      );
      await expect(
        service.recordPayment(
          'inv-1',
          { amount: 30, method: 'cash', date: '2026-07-10' } as any, // 80+30 > 100
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(paymentRepo.save).not.toHaveBeenCalled();
      expect(posting.postCustomerPayment).not.toHaveBeenCalled();
    });

    it('rejects a non-positive amount', async () => {
      invoiceRepo.findOne.mockResolvedValue(sentInvoice());
      await expect(
        service.recordPayment(
          'inv-1',
          { amount: 0, method: 'cash', date: '2026-07-10' } as any,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('void', () => {
    it('refuses to void an invoice that has recorded payments', async () => {
      invoiceRepo.findOne.mockResolvedValue({ id: 'inv-1', status: 'SENT' });
      paymentRepo.count.mockResolvedValue(1);
      await expect(service.void('inv-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
