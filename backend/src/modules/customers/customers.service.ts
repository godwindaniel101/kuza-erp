import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Not } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Invoice } from '../invoicing/entities/invoice.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
  ) {}

  async findAll(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.customerRepository.createQueryBuilder('customer');

    if (query.search) {
      qb.where(
        '(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [items, total] = await qb
      .orderBy('customer.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Invoice summary — VOID invoices are excluded; DRAFTs are not yet issued.
    const summaryRaw = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.total), 0)', 'totalInvoiced')
      .addSelect('COALESCE(SUM(invoice.amountPaid), 0)', 'totalPaid')
      .where('invoice.customerId = :id', { id })
      .andWhere('invoice.status NOT IN (:...excluded)', {
        excluded: ['DRAFT', 'VOID'],
      })
      .getRawOne();

    const totalInvoiced = Number(summaryRaw?.totalInvoiced || 0);
    const totalPaid = Number(summaryRaw?.totalPaid || 0);

    return {
      ...customer,
      invoiceSummary: {
        totalInvoiced,
        totalPaid,
        balance: Number((totalInvoiced - totalPaid).toFixed(2)),
      },
    };
  }

  async create(dto: CreateCustomerDto) {
    if (dto.email) {
      const existing = await this.customerRepository.findOne({
        where: { email: ILike(dto.email) },
      });
      if (existing) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    const customer = this.customerRepository.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });
    return this.customerRepository.save(customer);
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (dto.email && dto.email !== customer.email) {
      const existing = await this.customerRepository.findOne({
        where: { email: ILike(dto.email), id: Not(id) },
      });
      if (existing) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    Object.assign(customer, dto);
    return this.customerRepository.save(customer);
  }

  /**
   * Delete a customer. If the customer has invoices we soft-delete
   * (isActive = false) to preserve invoice history; otherwise hard delete.
   */
  async remove(id: string) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const invoiceCount = await this.invoiceRepository.count({
      where: { customerId: id },
    });

    if (invoiceCount > 0) {
      customer.isActive = false;
      await this.customerRepository.save(customer);
      return { deleted: false, deactivated: true };
    }

    await this.customerRepository.remove(customer);
    return { deleted: true, deactivated: false };
  }
}
