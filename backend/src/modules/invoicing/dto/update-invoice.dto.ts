import { PartialType } from '@nestjs/swagger';
import { CreateInvoiceDto } from './create-invoice.dto';

/** Only DRAFT invoices may be updated. Totals are always recomputed server-side. */
export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}
