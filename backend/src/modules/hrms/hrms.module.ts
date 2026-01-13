import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeavesModule } from './leaves/leaves.module';
import { PayrollModule } from './payroll/payroll.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { PerformanceModule } from './performance/performance.module';
import { LearningModule } from './learning/learning.module';
import { BenefitsModule } from './benefits/benefits.module';
import { CompensationModule } from './compensation/compensation.module';
import { DepartmentsModule } from './departments/departments.module';
import { PositionsModule } from './positions/positions.module';
import { LocationsModule } from './locations/locations.module';
import { LeaveTypesModule } from './leave-types/leave-types.module';

@Module({
  imports: [
    EmployeesModule,
    AttendanceModule,
    LeavesModule,
    PayrollModule,
    RecruitmentModule,
    PerformanceModule,
    LearningModule,
    BenefitsModule,
    CompensationModule,
    DepartmentsModule,
    PositionsModule,
    LocationsModule,
    LeaveTypesModule,
  ],
  exports: [
    EmployeesModule,
    AttendanceModule,
    LeavesModule,
    PayrollModule,
    RecruitmentModule,
    PerformanceModule,
    LearningModule,
    BenefitsModule,
    CompensationModule,
    DepartmentsModule,
    PositionsModule,
    LocationsModule,
    LeaveTypesModule,
  ],
})
export class HrmsModule {}

