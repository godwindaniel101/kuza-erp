import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('payments')
@ApiBearerAuth()
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post('connections')
  @RequirePermissions('settings.edit')
  @ApiOperation({
    summary:
      'Create an integration connection (returns the webhook URL + secret ONCE)',
  })
  async create(@Body() dto: CreateConnectionDto, @Request() req: any) {
    const data = await this.connectionsService.create(dto, {
      id: req.tenant?.id,
      schemaName: req.tenant?.schemaName,
    });
    return { success: true, data };
  }

  @Get('connections')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'List integration connections (secrets redacted)' })
  async findAll() {
    const data = await this.connectionsService.findAll();
    return { success: true, data };
  }

  @Get('connections/:id')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Get one integration connection (secrets redacted)' })
  async findOne(@Param('id') id: string) {
    const data = await this.connectionsService.findOne(id);
    return { success: true, data };
  }

  @Patch('connections/:id')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Update label/status/config (config merges key-by-key)' })
  async update(@Param('id') id: string, @Body() dto: UpdateConnectionDto) {
    const data = await this.connectionsService.update(id, dto);
    return { success: true, data };
  }

  @Delete('connections/:id')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Delete a connection and its public webhook route' })
  async remove(@Param('id') id: string) {
    const data = await this.connectionsService.remove(id);
    return { success: true, data };
  }

  @Post('connections/:id/virtual-account')
  @RequirePermissions('settings.edit')
  @ApiOperation({
    summary: 'Create a provider virtual account for a customer',
  })
  async createVirtualAccount(
    @Param('id') id: string,
    @Body() dto: CreateVirtualAccountDto,
  ) {
    const data = await this.connectionsService.createVirtualAccount(
      id,
      dto.customerId,
    );
    return { success: true, data };
  }

  @Get('events')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Paginated webhook event inbox (for debugging)' })
  async listEvents(
    @Query('connectionId') connectionId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.connectionsService.listEvents({
      connectionId,
      status,
      page,
      limit,
    });
    return { success: true, data };
  }
}
