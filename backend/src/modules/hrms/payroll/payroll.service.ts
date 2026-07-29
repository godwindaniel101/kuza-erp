import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Transactional } from "typeorm-transactional";
import { Payroll } from "../entities/payroll.entity";
import { PayrollItem } from "../entities/payroll-item.entity";
import { Employee } from "../entities/employee.entity";
import { CreatePayrollDto } from "./dto/create-payroll.dto";
import { UpdatePayrollDto } from "./dto/update-payroll.dto";
import { TaxCalculationService } from "./tax-calculation.service";
import { PostingService } from "../../accounting/posting.service";
import { ACCOUNT_CODES } from "../../accounting/accounting.constants";

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
    private postingService: PostingService,
  ) {}

  /**
   * GTM decision D1 (docs/GTM.md): the tax engine currently implements US
   * federal/state rules. Running it for a Nigerian/Kenyan business would
   * mis-compute salaries and tax liabilities — a trust-destroying failure on
   * a money path. Payroll runs are therefore disabled until a country-correct
   * tax pack exists. Set ENABLE_US_PAYROLL=true only for US tenants/testing.
   */
  private assertPayrollRunsEnabled() {
    if (process.env.ENABLE_US_PAYROLL !== "true") {
      throw new BadRequestException(
        "Payroll runs are coming soon for your country. The current tax engine supports US tax rules only and is disabled to protect your books. Employee records, leave and attendance remain fully available.",
      );
    }
  }

  async create(createDto: CreatePayrollDto) {
    this.assertPayrollRunsEnabled();
    let grossPay = 0;
    let totalDeductions = 0;

    const payroll = this.payrollRepository.create({
      ...createDto,
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
      createDto.employeeId,
      grossPay,
      createDto.payPeriod,
    );

    // Add tax items to payroll items
    const taxItems = [
      {
        type: "tax",
        name: "Federal Tax",
        amount: taxes.federalTax,
        isEarning: false,
        description: "Federal income tax",
        payrollId: savedPayroll.id,
      },
      {
        type: "tax",
        name: "State Tax",
        amount: taxes.stateTax,
        isEarning: false,
        description: "State income tax",
        payrollId: savedPayroll.id,
      },
      {
        type: "tax",
        name: "Local Tax",
        amount: taxes.localTax,
        isEarning: false,
        description: "Local income tax",
        payrollId: savedPayroll.id,
      },
      {
        type: "tax",
        name: "Social Security Tax",
        amount: taxes.socialSecurityTax,
        isEarning: false,
        description: "Social Security tax",
        payrollId: savedPayroll.id,
      },
      {
        type: "tax",
        name: "Medicare Tax",
        amount: taxes.medicareTax,
        isEarning: false,
        description: "Medicare tax",
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
    savedPayroll.paymentStatus = "pending";

    return this.payrollRepository.save(savedPayroll);
  }

  async findAll(employeeId?: string) {
    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }

    return this.payrollRepository.find({
      where,
      relations: ["employee", "items"],
      order: { payDate: "DESC" },
    });
  }

  async findOne(id: string) {
    const payroll = await this.payrollRepository.findOne({
      where: { id },
      relations: ["employee", "items"],
    });

    if (!payroll) {
      throw new NotFoundException("Payroll not found");
    }

    return payroll;
  }

  async update(id: string, updateDto: UpdatePayrollDto) {
    await this.findOne(id);
    await this.payrollRepository.update({ id }, updateDto);
    return this.findOne(id);
  }

  @Transactional()
  async approve(id: string, approvedBy: string) {
    this.assertPayrollRunsEnabled();
    const payroll = await this.findOne(id);
    payroll.status = "approved";
    payroll.approvedBy = approvedBy;
    payroll.approvedAt = new Date();
    const saved = await this.payrollRepository.save(payroll);

    // Double-entry posting (audit A7): Dr Wage Expense for gross pay; Cr Tax
    // Payable for withheld taxes; Cr Wages Payable for the remainder (net pay
    // plus non-tax deductions owed to third parties). Same transaction as the
    // approval; idempotent per payroll id.
    const gross = Math.round(Number(payroll.grossPay) * 100) / 100;
    const tax = Math.round(Number(payroll.totalTax || 0) * 100) / 100;
    const payable = Math.round((gross - tax) * 100) / 100;
    if (gross > 0) {
      await this.postingService.postEntry({
        sourceType: "payroll",
        sourceId: payroll.id,
        memo: `Payroll approved for period ${payroll.payPeriodStart} – ${payroll.payPeriodEnd}`,
        lines: [
          { accountCode: ACCOUNT_CODES.WAGE_EXPENSE, debit: gross },
          ...(tax > 0
            ? [{ accountCode: ACCOUNT_CODES.TAX_PAYABLE, credit: tax }]
            : []),
          { accountCode: ACCOUNT_CODES.WAGES_PAYABLE, credit: payable },
        ],
      });
    }

    return saved;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.payrollRepository.delete({ id });
  }

  @Transactional()
  async processPayment(id: string) {
    this.assertPayrollRunsEnabled();
    const payroll = await this.findOne(id);

    if (payroll.status !== "approved") {
      throw new NotFoundException(
        "Payroll must be approved before processing payment",
      );
    }

    if (payroll.paymentStatus === "processed") {
      throw new NotFoundException("Payment already processed");
    }

    // Get employee bank details
    const employee = await this.employeeRepository.findOne({
      where: { id: payroll.employeeId },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    // Generate bank file (CSV format)
    const bankFile = this.generateBankFile(payroll, employee);

    // Update payroll payment status
    payroll.paymentStatus = "processed";
    payroll.paidAt = new Date();
    payroll.paymentReference = `PAY-${Date.now()}-${payroll.id.substring(0, 8).toUpperCase()}`;

    await this.payrollRepository.save(payroll);

    // Double-entry posting: paying out net wages clears the payable.
    // Dr Wages Payable / Cr Bank. Idempotent per payroll id under the
    // distinct 'payroll_payout' source type.
    const net = Math.round(Number(payroll.netPay) * 100) / 100;
    if (net > 0) {
      await this.postingService.postEntry({
        sourceType: "payroll_payout",
        sourceId: payroll.id,
        memo: `Payroll payout ${payroll.paymentReference}`,
        lines: [
          { accountCode: ACCOUNT_CODES.WAGES_PAYABLE, debit: net },
          { accountCode: ACCOUNT_CODES.BANK, credit: net },
        ],
      });
    }

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
      "Employee Name,Account Number,Routing Number,Amount,Payment Date,Reference",
      `"${employee.firstName} ${employee.lastName}",${employee.bankAccountNumber || ""},${employee.bankRoutingNumber || ""},${payroll.netPay.toFixed(2)},${payroll.payDate.toISOString().split("T")[0]},${payroll.paymentReference || payroll.id}`,
    ];

    return csvLines.join("\n");
  }

  async generatePayStub(id: string) {
    const payroll = await this.findOne(id);
    const employee = await this.employeeRepository.findOne({
      where: { id: payroll.employeeId },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
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
