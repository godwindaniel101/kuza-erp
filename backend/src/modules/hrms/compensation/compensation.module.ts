import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompensationController } from './compensation.controller';
import { CompensationService } from './compensation.service';
import { SalaryStructure } from '../entities/salary-structure.entity';
import { EmployeeSalary } from '../entities/employee-salary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalaryStructure, EmployeeSalary])],
  controllers: [CompensationController],
  providers: [CompensationService],
  exports: [CompensationService],
})
export class CompensationModule {}

