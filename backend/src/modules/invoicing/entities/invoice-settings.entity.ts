import { Entity, Column } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

export type InvoiceTemplate = 'classic' | 'modern' | 'minimal';

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  'classic',
  'modern',
  'minimal',
];

/**
 * Per-tenant invoice branding / template / sending customization.
 * Singleton: exactly one row per tenant schema (see InvoiceSettingsService.getOrCreate).
 */
@Entity('invoice_settings')
export class InvoiceSettings extends TenantEntity {
  // --- Branding ---
  @Column({ type: 'varchar', nullable: true })
  logoUrl: string;

  @Column({ type: 'varchar', default: '#2563EB' })
  accentColor: string;

  @Column({ type: 'varchar', default: 'classic' })
  template: InvoiceTemplate;

  @Column({ type: 'boolean', default: true })
  showLogo: boolean;

  // --- Business block shown on the invoice ---
  @Column({ type: 'varchar', nullable: true })
  displayName: string;

  @Column({ type: 'varchar', nullable: true })
  addressLine: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  website: string;

  @Column({ type: 'varchar', nullable: true })
  taxId: string;

  @Column({ type: 'varchar', nullable: true })
  registrationNo: string;

  // --- Defaults ---
  @Column({ type: 'varchar', default: 'NGN' })
  currency: string;

  @Column({ type: 'varchar', default: 'VAT' })
  taxLabel: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRatePct: number;

  @Column({ type: 'boolean', default: true })
  showTax: boolean;

  @Column({ type: 'int', default: 14 })
  paymentTermsDays: number;

  @Column({ type: 'varchar', default: 'INV-' })
  numberPrefix: string;

  @Column({ type: 'text', nullable: true })
  footerNote: string;

  @Column({ type: 'text', nullable: true })
  terms: string;

  // --- Payment details block ---
  @Column({ type: 'boolean', default: true })
  showPaymentDetails: boolean;

  @Column({ type: 'varchar', nullable: true })
  bankName: string;

  @Column({ type: 'varchar', nullable: true })
  accountName: string;

  @Column({ type: 'varchar', nullable: true })
  accountNumber: string;

  @Column({ type: 'text', nullable: true })
  paymentInstructions: string;

  // --- Sending ---
  @Column({ type: 'varchar', nullable: true })
  senderName: string;

  @Column({ type: 'varchar', nullable: true })
  replyToEmail: string;

  @Column({ type: 'varchar', nullable: true })
  ccEmails: string;

  @Column({ type: 'varchar', default: 'Invoice {{invoiceNumber}} from {{business}}' })
  emailSubject: string;

  @Column({ type: 'text', nullable: true })
  emailBody: string;

  @Column({ type: 'boolean', default: true })
  attachPdf: boolean;

  @Column({ type: 'boolean', default: false })
  autoSend: boolean;
}
