import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { Employee } from '../entities/employee.entity';
import { Department } from '../entities/department.entity';
import { Position } from '../entities/position.entity';
import { Location } from '../entities/location.entity';
import { InvitationsModule } from '../../settings/invitations/invitations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Department, Position, Location]),
    InvitationsModule, // Add InvitationsModule for invitation flow
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
