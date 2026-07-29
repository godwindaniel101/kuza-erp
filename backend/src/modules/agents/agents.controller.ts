import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';

/**
 * Agent personas CRUD. Gated behind the `ai` assist app; reads need
 * settings.view, writes settings.edit.
 */
@ApiTags('AI Agents')
@Controller('ai/agents')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('ai')
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'List agent personas' })
  async findAll() {
    return { success: true, data: await this.agentsService.findAll() };
  }

  @Get(':id')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get one agent persona' })
  async findOne(@Param('id') id: string) {
    return { success: true, data: await this.agentsService.findOne(id) };
  }

  @Post()
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Create an agent persona' })
  async create(@Body() dto: CreateAgentDto) {
    return { success: true, data: await this.agentsService.create(dto) };
  }

  @Patch(':id')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Update an agent persona' })
  async update(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return { success: true, data: await this.agentsService.update(id, dto) };
  }

  @Post(':id/activate')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Activate an agent (starts auto-replying)' })
  async activate(@Param('id') id: string) {
    return { success: true, data: await this.agentsService.setStatus(id, 'active') };
  }

  @Post(':id/pause')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Pause an agent (stops auto-replying)' })
  async pause(@Param('id') id: string) {
    return { success: true, data: await this.agentsService.setStatus(id, 'paused') };
  }

  @Delete(':id')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Delete an agent persona' })
  async remove(@Param('id') id: string) {
    await this.agentsService.remove(id);
    return { success: true };
  }
}
