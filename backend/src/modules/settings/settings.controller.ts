import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('Settings')
@Controller('settings')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get restaurant settings' })
  async getSettings(@Request() req) {
    const settings = await this.settingsService.getSettings(req.user.businessId);
    return {
      success: true,
      data: settings,
    };
  }

  @Put()
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Update restaurant settings' })
  async updateSettings(
    @Request() req,
    @Body() updateDto: UpdateSettingsDto,
    @I18n() i18n: I18nContext,
  ) {
    const settings = await this.settingsService.updateSettings(req.user.businessId, updateDto);
    return {
      success: true,
      data: settings,
      message: i18n.t('common.updated'),
    };
  }

  @Get('permissions')
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'Get all permissions' })
  async getPermissions(@Request() req) {
    const permissions = await this.settingsService.getAllPermissions();
    return {
      success: true,
      data: permissions,
    };
  }
}

