import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';
import {
  CHANNEL_PLUGINS,
  CAPABILITY_PLUGINS,
  READ_ONLY_CAPABILITY_KEYS,
} from './plugin-registry';

/** Exposes the code-level plugin registry to the Channels/Agents UI. */
@ApiTags('AI Agents')
@Controller('ai/plugins')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('ai')
@ApiBearerAuth()
export class PluginsController {
  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'List channel + capability plugins (with live/stub flags)' })
  list() {
    return {
      success: true,
      data: {
        channels: CHANNEL_PLUGINS,
        capabilities: CAPABILITY_PLUGINS,
        readOnlyCapabilityKeys: READ_ONLY_CAPABILITY_KEYS,
      },
    };
  }
}
