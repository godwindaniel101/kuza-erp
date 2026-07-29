import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../../billing/guards/feature-gate.guard';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto, UpdateStatusDto } from './dto/update-reservation.dto';

@ApiTags('Reservations')
@Controller('rms/reservations')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('rms')
@ApiBearerAuth()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @RequirePermissions('reservations.view')
  @ApiOperation({ summary: 'List reservations (optional date range / status / branch)' })
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
  ) {
    const data = await this.reservationsService.findAll({ from, to, status, branchId });
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('reservations.view')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.reservationsService.findOne(id) };
  }

  @Post()
  @RequirePermissions('reservations.create')
  @ApiOperation({ summary: 'Create a reservation (staff)' })
  async create(@Body() dto: CreateReservationDto, @Request() req: any) {
    const data = await this.reservationsService.create(dto, req.user);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('reservations.edit')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return { success: true, data: await this.reservationsService.update(id, dto) };
  }

  @Patch(':id/status')
  @RequirePermissions('reservations.edit')
  @ApiOperation({ summary: 'Change status (confirm / seat / complete / cancel / no-show) + assign table' })
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return { success: true, data: await this.reservationsService.updateStatus(id, dto) };
  }

  @Delete(':id')
  @RequirePermissions('reservations.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.reservationsService.remove(id);
    return { success: true };
  }
}
