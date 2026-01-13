import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('RMS - Orders')
@Controller('rms/orders')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @RequirePermissions('orders.create')
  @ApiOperation({ summary: 'Create a new order' })
  async create(@Request() req, @Body() createOrderDto: CreateOrderDto, @I18n() i18n: I18nContext) {
    const order = await this.ordersService.create(
      req.user.businessId,
      createOrderDto.branchId,
      createOrderDto,
    );
    return {
      success: true,
      data: order,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Get all orders' })
  async findAll(@Request() req, @Query('branchId') branchId?: string) {
    const orders = await this.ordersService.findAll(req.user.businessId, branchId);
    return {
      success: true,
      data: orders,
    };
  }

  @Get(':id')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Get order by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const order = await this.ordersService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: order,
    };
  }

  @Patch(':id')
  @RequirePermissions('orders.edit')
  @ApiOperation({ summary: 'Update order' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @I18n() i18n: I18nContext,
  ) {
    const order = await this.ordersService.update(id, req.user.businessId, updateOrderDto);
    return {
      success: true,
      data: order,
      message: i18n.t('common.updated'),
    };
  }

  @Post(':id/mark-paid')
  @RequirePermissions('orders.edit')
  @ApiOperation({ summary: 'Mark order as paid' })
  async markAsPaid(
    @Request() req,
    @Param('id') id: string,
    @Body() paymentDto: MarkPaidDto,
    @I18n() i18n: I18nContext,
  ) {
    const order = await this.ordersService.markAsPaid(id, req.user.businessId, paymentDto);
    return {
      success: true,
      data: order,
      message: i18n.t('paymentProcessed') || 'Payment processed successfully',
    };
  }

  @Delete(':id')
  @RequirePermissions('orders.delete')
  @ApiOperation({ summary: 'Delete order' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.ordersService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}
