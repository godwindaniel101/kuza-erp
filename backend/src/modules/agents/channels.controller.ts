import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import {
  CreateChannelConnectionDto,
  UpdateChannelConnectionDto,
  ConnectTelegramDto,
} from './dto/channel-connection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';

/** Channel connections (WhatsApp, Instagram, …) — connect/disconnect + config. */
@ApiTags('AI Agents')
@Controller('ai/channels')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('ai')
@ApiBearerAuth()
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'List channel connections' })
  async findAll() {
    return { success: true, data: await this.channelsService.findAll() };
  }

  @Post()
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Create a channel connection (no secrets stored)' })
  async create(@Body() dto: CreateChannelConnectionDto) {
    return { success: true, data: await this.channelsService.create(dto) };
  }

  @Patch(':id')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Update a channel connection' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChannelConnectionDto,
  ) {
    return { success: true, data: await this.channelsService.update(id, dto) };
  }

  @Post(':id/connect')
  @RequirePermissions('settings.edit')
  @ApiOperation({
    summary:
      'Begin connecting a channel — Meta OAuth redirect, Telegram token prompt, or instant web chat',
  })
  async connect(@Param('id') id: string, @Req() req: any) {
    const ctx = {
      tenantId: req?.user?.tenantId,
      schemaName: req?.tenant?.schemaName ?? req?.user?.tenant?.schemaName,
    };
    return { success: true, data: await this.channelsService.connect(id, ctx) };
  }

  @Post(':id/connect/telegram')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Finish a Telegram connection with a BotFather token' })
  async connectTelegram(
    @Param('id') id: string,
    @Body() dto: ConnectTelegramDto,
  ) {
    return {
      success: true,
      data: await this.channelsService.connectTelegram(id, dto.botToken),
    };
  }

  @Post(':id/disconnect')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Disconnect a channel' })
  async disconnect(@Param('id') id: string) {
    return { success: true, data: await this.channelsService.disconnect(id) };
  }

  @Delete(':id')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Delete a channel connection' })
  async remove(@Param('id') id: string) {
    await this.channelsService.remove(id);
    return { success: true };
  }
}
