import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsInt,
  IsEmail,
  IsIn,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { INVOICE_TEMPLATES, InvoiceTemplate } from '../entities/invoice-settings.entity';

export class UpdateInvoiceSettingsDto {
  // --- Branding ---
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'accentColor must be a valid hex color (e.g. #2563EB)',
  })
  accentColor?: string;

  @IsOptional()
  @IsIn(INVOICE_TEMPLATES)
  template?: InvoiceTemplate;

  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  // --- Business block ---
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  registrationNo?: string;

  // --- Defaults ---
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  taxLabel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRatePct?: number;

  @IsOptional()
  @IsBoolean()
  showTax?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermsDays?: number;

  @IsOptional()
  @IsString()
  numberPrefix?: string;

  @IsOptional()
  @IsString()
  footerNote?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  // --- Payment details block ---
  @IsOptional()
  @IsBoolean()
  showPaymentDetails?: boolean;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  paymentInstructions?: string;

  // --- Sending ---
  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsEmail()
  replyToEmail?: string;

  @IsOptional()
  @IsString()
  ccEmails?: string;

  @IsOptional()
  @IsString()
  emailSubject?: string;

  @IsOptional()
  @IsString()
  emailBody?: string;

  @IsOptional()
  @IsBoolean()
  attachPdf?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSend?: boolean;
}
