import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll } from '../entities/payroll.entity';
import { PayrollItem } from '../entities/payroll-item.entity';
import { Employee } from '../entities/employee.entity';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { TaxCalculationService } from './tax-calculation.service';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payroll)
    private payrollRepository: Repository<Payroll>,
    @InjectRepository(PayrollItem)
    private payrollItemRepository: Repository<PayrollItem>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private taxCalculationService: TaxCalculationService,
  ) {}

  async create(businessId: string, createDto: CreatePayrollDto) {
    let grossPay = 0;
    let totalDeductions = 0;

    const payroll = this.payrollRepository.create({
      ...createDto,
      businessId,
      payPeriodStart: new Date(createDto.payPeriodStart),
      payPeriodEnd: new Date(createDto.payPeriodEnd),
      payDate: new Date(createDto.payDate),
    });

    const savedPayroll = await this.payrollRepository.save(payroll);

    // Create payroll items
    if (createDto.items) {
      const items = createDto.items.map((item) => {
        if (item.isEarning) {
          grossPay += Number(item.amount);
        } else {
          totalDeductions += Number(item.amount);
        }
        return this.payrollItemRepository.create({
          ...item,
          payrollId: savedPayroll.id,
        });
      });

      await this.payrollItemRepository.save(items);
    }

    // Calculate taxes
    const taxes = await this.taxCalculationService.calculateTaxes(
      businessId,
      createDto.employeeId,
      grossPay,
      createDto.payPeriod,
    );

    // Add tax items to payroll items
    const taxItems = [
      {
        type: 'tax',
        name: 'Federal Tax',
        amount: taxes.federalTax,
        isEarning: false,
        description: 'Federal income tax',
        payrollId: savedPayroll.id,
      },
      {
        type: 'tax',
        name: 'State Tax',
        amount: taxes.stateTax,
        isEarning: false,
        description: 'State income tax',
        payrollId: savedPayroll.id,
      },
      {
        type: 'tax',
        name: 'Local Tax',
        amount: taxes.localTax,
        isEarning: false,
        description: 'Local income tax',
        payrollId: savedPayroll.id,
      },
      {
        type: 'tax',
        name: 'Social Security Tax',
        amount: taxes.socialSecurityTax,
        isEarning: false,
        description: 'Social Security tax',
        payrollId: savedPayroll.id,
      },
      {
        type: 'tax',
        name: 'Medicare Tax',
        amount: taxes.medicareTax,
        isEarning: false,
        description: 'Medicare tax',
        payrollId: savedPayroll.id,
      },
    ].filter((item) => item.amount > 0);

    if (taxItems.length > 0) {
      const taxPayrollItems = taxItems.map((item) =>
        this.payrollItemRepository.create(item),
      );
      await this.payrollItemRepository.save(taxPayrollItems);
      totalDeductions += taxes.totalTax;
    }

    // Calculate net pay
    const netPay = grossPay - totalDeductions;
    savedPayroll.grossPay = grossPay;
    savedPayroll.totalDeductions = totalDeductions;
    savedPayroll.netPay = netPay;
    savedPayroll.federalTax = taxes.federalTax;
    savedPayroll.stateTax = taxes.stateTax;
    savedPayroll.localTax = taxes.localTax;
    savedPayroll.socialSecurityTax = taxes.socialSecurityTax;
    savedPayroll.medicareTax = taxes.medicareTax;
    savedPayroll.totalTax = taxes.totalTax;
    savedPayroll.paymentStatus = 'pending';

    return this.payrollRepository.save(savedPayroll);
  }

  async findAll(businessId: string, employeeId?: string) {
    const where: any = { businessId };
    if (employeeId) {
      where.employeeId = employeeId;
    }

    return this.payrollRepository.find({
      where,
      relations: ['employee', 'items'],
      order: { payDate: 'DESC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const payroll = await this.payrollRepository.findOne({
      where: { id, businessId },
      relations: ['employee', 'items'],
    });

    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    return payroll;
  }

  async update(id: string, businessId: string, updateDto: UpdatePayrollDto) {
    await this.findOne(id, businessId);
    await this.payrollRepository.update({ id }, updateDto);
    return this.findOne(id, businessId);
  }

  async approve(id: string, businessId: string, approvedBy: string) {
    const payroll = await this.findOne(id, businessId);
    payroll.status = 'approved';
    payroll.approvedBy = approvedBy;
    payroll.approvedAt = new Date();
    return this.payrollRepository.save(payroll);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.payrollRepository.delete({ id });
  }

  async processPayment(id: string, businessId: string) {
    const payroll = await this.findOne(id, businessId);

    if (payroll.status !== 'approved') {
      throw new NotFoundException('Payroll must be approved before processing payment');
    }

    if (payroll.paymentStatus === 'processed') {
      throw new NotFoundException('Payment already processed');
    }

    // Get employee bank details
    const employee = await this.employeeRepository.findOne({
      where: { id: payroll.employeeId, businessId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Generate bank file (CSV format)
    const bankFile = this.generateBankFile(payroll, employee);

    // Update payroll payment status
    payroll.paymentStatus = 'processed';
    payroll.paidAt = new Date();
    payroll.paymentReference = `PAY-${Date.now()}-${payroll.id.substring(0, 8).toUpperCase()}`;

    await this.payrollRepository.save(payroll);

    return {
      payroll,
      bankFile,
      paymentReference: payroll.paymentReference,
    };
  }

  private generateBankFile(payroll: Payroll, employee: Employee): string {
    // Generate simplified CSV format for bank import
    // In production, this should follow NACHA ACH file format or bank-specific format
    const csvLines = [
      'Employee Name,Account Number,Routing Number,Amount,Payment Date,Reference',
      `"${employee.firstName} ${employee.lastName}",${employee.bankAccountNumber || ''},${employee.bankRoutingNumber || ''},${payroll.netPay.toFixed(2)},${payroll.payDate.toISOString().split('T')[0]},${payroll.paymentReference || payroll.id}`,
    ];

    return csvLines.join('\n');
  }

  async generatePayStub(id: string, businessId: string) {
    const payroll = await this.findOne(id, businessId);
    const employee = await this.employeeRepository.findOne({
      where: { id: payroll.employeeId, businessId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Generate pay stub data (in production, use PDF library like pdfkit or puppeteer)
    const payStub = {
      employee: {
        name: `${employee.firstName} ${employee.lastName}`,
        employeeNumber: employee.employeeNumber,
        email: employee.email,
      },
      payroll: {
        payPeriod: payroll.payPeriod,
        payPeriodStart: payroll.payPeriodStart,
        payPeriodEnd: payroll.payPeriodEnd,
        payDate: payroll.payDate,
      },
      earnings: {
        grossPay: payroll.grossPay,
      },
      deductions: {
        federalTax: payroll.federalTax,
        stateTax: payroll.stateTax,
        localTax: payroll.localTax,
        socialSecurityTax: payroll.socialSecurityTax,
        medicareTax: payroll.medicareTax,
        otherDeductions: payroll.totalDeductions - payroll.totalTax,
        totalDeductions: payroll.totalDeductions,
      },
      netPay: payroll.netPay,
      items: payroll.items,
    };

    return payStub;
  }
}
