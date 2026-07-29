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
import { KnowledgeService } from './knowledge.service';
import {
  CreateKnowledgeDocDto,
  UpdateKnowledgeDocDto,
} from './dto/knowledge-doc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';

/** Training material (FAQ / policy / catalog snapshot / freeform). */
@ApiTags('AI Agents')
@Controller('ai/knowledge')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('ai')
@ApiBearerAuth()
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'List knowledge/training documents' })
  async findAll(@Query('agentId') agentId?: string) {
    return { success: true, data: await this.knowledgeService.findAll(agentId) };
  }

  @Post()
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Create a knowledge/training document' })
  async create(@Body() dto: CreateKnowledgeDocDto) {
    return { success: true, data: await this.knowledgeService.create(dto) };
  }

  @Patch(':id')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Update a knowledge document' })
  async update(@Param('id') id: string, @Body() dto: UpdateKnowledgeDocDto) {
    return { success: true, data: await this.knowledgeService.update(id, dto) };
  }

  @Post(':id/archive')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Archive a knowledge document' })
  async archive(@Param('id') id: string) {
    return { success: true, data: await this.knowledgeService.archive(id) };
  }

  @Delete(':id')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Delete a knowledge document' })
  async remove(@Param('id') id: string) {
    await this.knowledgeService.remove(id);
    return { success: true };
  }
}
