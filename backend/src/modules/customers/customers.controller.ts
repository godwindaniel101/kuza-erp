import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('customers')
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions('sales.view')
  @ApiOperation({ summary: 'List customers (paginated, searchable)' })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.customersService.findAll({ search, page, limit });
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('sales.manage')
  @ApiOperation({ summary: 'Create customer' })
  async create(@Body() dto: CreateCustomerDto) {
    const customer = await this.customersService.create(dto);
    return { success: true, data: customer };
  }

  @Get(':id')
  @RequirePermissions('sales.view')
  @ApiOperation({ summary: 'Get customer with invoice summary' })
  async findOne(@Param('id') id: string) {
    const customer = await this.customersService.findOne(id);
    return { success: true, data: customer };
  }

  @Patch(':id')
  @RequirePermissions('sales.manage')
  @ApiOperation({ summary: 'Update customer' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    const customer = await this.customersService.update(id, dto);
    return { success: true, data: customer };
  }

  @Delete(':id')
  @RequirePermissions('sales.manage')
  @ApiOperation({
    summary: 'Delete customer (soft-deactivate when invoices exist)',
  })
  async remove(@Param('id') id: string) {
    const result = await this.customersService.remove(id);
    return { success: true, data: result };
  }
}
