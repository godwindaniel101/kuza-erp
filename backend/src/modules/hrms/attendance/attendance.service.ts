import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not } from 'typeorm';
import { TimeEntry } from '../entities/time-entry.entity';
import { Timesheet } from '../entities/timesheet.entity';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(TimeEntry)
    private timeEntryRepository: Repository<TimeEntry>,
    @InjectRepository(Timesheet)
    private timesheetRepository: Repository<Timesheet>,
  ) {}

  async clockIn(employeeId: string, clockInDto: ClockInDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    const existingEntry = await this.timeEntryRepository.findOne({
      where: {
        employeeId,
        entryDate: today,
        clockIn: Not(IsNull()),
        clockOut: IsNull(),
      },
    });

    if (existingEntry) {
      throw new BadRequestException('Already clocked in today');
    }

    const clockInTime = new Date();

    let entry = await this.timeEntryRepository.findOne({
      where: {
        employeeId,
        entryDate: today,
      },
    });

    if (entry) {
      entry.clockIn = clockInTime;
      entry.location = clockInDto.location;
      entry.latitude = clockInDto.latitude;
      entry.longitude = clockInDto.longitude;
      entry.status = 'pending';
      entry.entryType = clockInDto.entryType || 'web';
    } else {
      entry = this.timeEntryRepository.create({
        employeeId,
        entryDate: today,
        clockIn: clockInTime,
        location: clockInDto.location,
        latitude: clockInDto.latitude,
        longitude: clockInDto.longitude,
        status: 'pending',
        entryType: clockInDto.entryType || 'web',
      });
    }

    return this.timeEntryRepository.save(entry);
  }

  async clockOut(employeeId: string, clockOutDto: ClockOutDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeEntry = await this.timeEntryRepository.findOne({
      where: {
        employeeId,
        entryDate: today,
        clockIn: Not(IsNull()),
        clockOut: IsNull(),
      },
    });

    if (!timeEntry) {
      throw new NotFoundException('No active clock-in found');
    }

    const clockOutTime = new Date();
    const clockInTime = timeEntry.clockIn!;

    // Calculate hours
    const totalMs = clockOutTime.getTime() - clockInTime.getTime();
    const totalHours = totalMs / (1000 * 60 * 60);
    const regularHours = Math.min(totalHours, 8);
    const overtimeHours = Math.max(0, totalHours - 8);

    timeEntry.clockOut = clockOutTime;
    timeEntry.totalHours = totalHours;
    timeEntry.regularHours = regularHours;
    timeEntry.overtimeHours = overtimeHours;
    timeEntry.status = 'pending';

    return this.timeEntryRepository.save(timeEntry);
  }

  async getAllTimeEntries(
    businessId: string,
    employeeId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const queryBuilder = this.timeEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.employee', 'employee')
      .where('employee.businessId = :businessId', { businessId });

    if (employeeId) {
      queryBuilder.andWhere('entry.employeeId = :employeeId', { employeeId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('entry.entryDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return queryBuilder.orderBy('entry.entryDate', 'DESC').getMany();
  }

  async getTimeEntries(employeeId: string, startDate?: Date, endDate?: Date) {
    const where: any = { employeeId };

    if (startDate && endDate) {
      where.entryDate = Between(startDate, endDate);
    }

    return this.timeEntryRepository.find({
      where,
      relations: ['employee'],
      order: { entryDate: 'DESC' },
    });
  }

  async getTimesheets(employeeId: string) {
    return this.timesheetRepository.find({
      where: { employeeId },
      relations: ['employee'],
      order: { weekStartDate: 'DESC' },
    });
  }

  async approveTimesheet(timesheetId: string, approvedBy: string) {
    const timesheet = await this.timesheetRepository.findOne({
      where: { id: timesheetId },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    timesheet.status = 'approved';
    timesheet.approvedBy = approvedBy;
    timesheet.approvedAt = new Date();

    return this.timesheetRepository.save(timesheet);
  }
}
