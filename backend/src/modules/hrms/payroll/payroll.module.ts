import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { TaxCalculationService } from './tax-calculation.service';
import { Payroll } from '../entities/payroll.entity';
import { PayrollItem } from '../entities/payroll-item.entity';
import { TaxConfiguration } from '../entities/tax-configuration.entity';
import { EmployeeTaxInfo } from '../entities/employee-tax-info.entity';
import { Employee } from '../entities/employee.entity';
import { AccountingModule } from '../../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payroll,
      PayrollItem,
      TaxConfiguration,
      EmployeeTaxInfo,
      Employee,
    ]),
    AccountingModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService, TaxCalculationService],
  exports: [PayrollService, TaxCalculationService],
})
export class PayrollModule {}

