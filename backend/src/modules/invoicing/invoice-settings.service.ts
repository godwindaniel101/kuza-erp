import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceSettings } from './entities/invoice-settings.entity';
import { UpdateInvoiceSettingsDto } from './dto/update-invoice-settings.dto';

@Injectable()
export class InvoiceSettingsService {
  constructor(
    @InjectRepository(InvoiceSettings)
    private readonly invoiceSettingsRepository: Repository<InvoiceSettings>,
  ) {}

  /**
   * Returns the single per-tenant invoice settings row, creating it with
   * column defaults if it does not yet exist (one-row-per-tenant pattern).
   */
  async getOrCreate(): Promise<InvoiceSettings> {
    const existing = await this.invoiceSettingsRepository.find({ take: 1 });
    if (existing.length > 0) {
      return existing[0];
    }

    const settings = this.invoiceSettingsRepository.create({});
    return this.invoiceSettingsRepository.save(settings);
  }

  /**
   * Merge the supplied fields onto the singleton settings row and persist.
   */
  async update(dto: UpdateInvoiceSettingsDto): Promise<InvoiceSettings> {
    const settings = await this.getOrCreate();
    Object.assign(settings, dto);
    return this.invoiceSettingsRepository.save(settings);
  }
}
