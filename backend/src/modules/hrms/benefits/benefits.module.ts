import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BenefitsController } from './benefits.controller';
import { BenefitsService } from './benefits.service';
import { BenefitPlan } from '../entities/benefit-plan.entity';
import { EmployeeBenefit } from '../entities/employee-benefit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BenefitPlan, EmployeeBenefit])],
  controllers: [BenefitsController],
  providers: [BenefitsService],
  exports: [BenefitsService],
})
export class BenefitsModule {}

