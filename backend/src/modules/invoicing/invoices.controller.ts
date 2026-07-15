import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';

@ApiTags('Invoicing')
@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('invoicing')
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermissions('sales.view')
  @ApiOperation({ summary: 'List invoices (paginated, filterable) + summary' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.invoicesService.findAll({
      page,
      limit,
      status,
      customerId,
      search,
    });
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('sales.manage')
  @ApiOperation({ summary: 'Create invoice (DRAFT, totals computed server-side)' })
  async create(@Body() dto: CreateInvoiceDto) {
    const invoice = await this.invoicesService.create(dto);
    return { success: true, data: invoice };
  }

  @Get(':id')
  @RequirePermissions('sales.view')
  @ApiOperation({ summary: 'Get invoice with lines, payments and customer' })
  async findOne(@Param('id') id: string) {
    const invoice = await this.invoicesService.findOne(id);
    return { success: true, data: invoice };
  }

  @Patch(':id')
  @RequirePermissions('sales.manage')
  @ApiOperation({ summary: 'Update invoice (DRAFT only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    const invoice = await this.invoicesService.update(id, dto);
    return { success: true, data: invoice };
  }

  @Post(':id/send')
  @RequirePermissions('sales.manage')
  @ApiOperation({ summary: 'Mark DRAFT invoice as SENT' })
  async send(@Param('id') id: string) {
    const invoice = await this.invoicesService.send(id);
    return { success: true, data: invoice };
  }

  @Post(':id/payments')
  @RequirePermissions('sales.manage')
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @Request() req: any,
  ) {
    const invoice = await this.invoicesService.recordPayment(
      id,
      dto,
      req.user?.sub,
    );
    return { success: true, data: invoice };
  }

  @Post(':id/void')
  @RequirePermissions('sales.manage')
  @ApiOperation({ summary: 'Void an invoice (only when no payments exist)' })
  async void(@Param('id') id: string) {
    const invoice = await this.invoicesService.void(id);
    return { success: true, data: invoice };
  }
}
