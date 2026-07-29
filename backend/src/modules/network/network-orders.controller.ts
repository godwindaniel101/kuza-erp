import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NetworkOrdersService } from './network-orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderActionDto } from './dto/order-action.dto';
import { ReceiveOrderDto } from './dto/receive-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { ShipOrderDto } from './dto/ship-order.dto';

/**
 * Kuza Network purchase orders (Phase 1). Cross-tenant, JWT-only. Every route
 * is scoped to the caller's tenant (req.user.tenantId); the service enforces
 * buyer/supplier authorization and valid status transitions.
 */
@ApiTags('Network')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('network/orders')
export class NetworkOrdersController {
  constructor(private readonly ordersService: NetworkOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a purchase order (draft or requested)' })
  async create(@Req() req: any, @Body() dto: CreateOrderDto) {
    const data = await this.ordersService.create(req.user.tenantId, req.user?.email ?? null, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List my orders (as buyer and/or supplier)' })
  async list(
    @Req() req: any,
    @Query('role') role?: 'buyer' | 'supplier',
    @Query('status') status?: string,
  ) {
    const data = await this.ordersService.list(req.user.tenantId, { role, status });
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const data = await this.ordersService.findOne(req.user.tenantId, id);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a draft order (buyer)' })
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    const data = await this.ordersService.updateDraft(req.user.tenantId, id, dto);
    return { success: true, data };
  }

  @Post(':id/submit')
  async submit(@Req() req: any, @Param('id') id: string) {
    const data = await this.ordersService.submit(req.user.tenantId, id);
    return { success: true, data };
  }

  @Post(':id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string, @Body() dto: OrderActionDto) {
    const data = await this.ordersService.cancel(req.user.tenantId, id, dto);
    return { success: true, data };
  }

  @Post(':id/accept')
  async accept(@Req() req: any, @Param('id') id: string, @Body() dto: OrderActionDto) {
    const data = await this.ordersService.accept(req.user.tenantId, id, dto);
    return { success: true, data };
  }

  @Post(':id/reject')
  async reject(@Req() req: any, @Param('id') id: string, @Body() dto: OrderActionDto) {
    const data = await this.ordersService.reject(req.user.tenantId, id, dto);
    return { success: true, data };
  }

  @Post(':id/ship')
  async ship(@Req() req: any, @Param('id') id: string, @Body() dto: ShipOrderDto) {
    const data = await this.ordersService.ship(req.user.tenantId, id, dto);
    return { success: true, data };
  }

  @Post(':id/receive')
  async receive(@Req() req: any, @Param('id') id: string, @Body() dto: ReceiveOrderDto) {
    const data = await this.ordersService.receive(req.user.tenantId, id, dto);
    return { success: true, data };
  }

  @Post(':id/pay')
  async pay(@Req() req: any, @Param('id') id: string, @Body() dto: PayOrderDto) {
    const data = await this.ordersService.pay(req.user.tenantId, id, dto);
    return { success: true, data };
  }

  @Post(':id/confirm-payment')
  async confirmPayment(@Req() req: any, @Param('id') id: string, @Body() dto: ConfirmPaymentDto) {
    const data = await this.ordersService.confirmPayment(req.user.tenantId, id, dto);
    return { success: true, data };
  }
}
