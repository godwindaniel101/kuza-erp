import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceSettingsController } from './invoice-settings.controller';
import { InvoiceSettingsService } from './invoice-settings.service';
import { Invoice } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice-line.entity';
import { InvoicePayment } from './entities/invoice-payment.entity';
import { InvoiceSettings } from './entities/invoice-settings.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AccountingModule } from '../accounting/accounting.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceLine, InvoicePayment, InvoiceSettings, Customer]),
    AccountingModule,
    NotificationsModule,
  ],
  controllers: [InvoicesController, InvoiceSettingsController],
  providers: [InvoicesService, InvoiceSettingsService],
  exports: [InvoicesService],
})
export class InvoicingModule {}
