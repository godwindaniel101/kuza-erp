import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { TimeEntry } from '../entities/time-entry.entity';
import { Timesheet } from '../entities/timesheet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TimeEntry, Timesheet])],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
