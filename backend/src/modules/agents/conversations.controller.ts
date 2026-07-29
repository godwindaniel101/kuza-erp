import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { InboundMessageDto, HumanReplyDto } from './dto/runtime.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';

/** Conversations inbox: threads, messages, human takeover, money-path approvals. */
@ApiTags('AI Agents')
@Controller('ai/conversations')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('ai')
@ApiBearerAuth()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  private userId(req: any): string | undefined {
    return req?.user?.id ?? req?.user?.userId;
  }

  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'List conversations (optional ?status=)' })
  async findAll(@Query('status') status?: string) {
    return { success: true, data: await this.conversationsService.findAll(status) };
  }

  @Get('pending-actions')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Money-path actions awaiting human approval' })
  async pendingActions() {
    return { success: true, data: await this.conversationsService.pendingActions() };
  }

  @Get(':id')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get one conversation' })
  async findOne(@Param('id') id: string) {
    return { success: true, data: await this.conversationsService.findOne(id) };
  }

  @Get(':id/messages')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Messages in a conversation' })
  async messages(@Param('id') id: string) {
    return { success: true, data: await this.conversationsService.messages(id) };
  }

  @Get(':id/actions')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Audit trail (tool calls) for a conversation' })
  async actions(@Param('id') id: string) {
    return { success: true, data: await this.conversationsService.actions(id) };
  }

  @Post('inbound')
  @RequirePermissions('settings.edit')
  @ApiOperation({
    summary:
      'Send an inbound customer message through the READ-ONLY runtime (test/preview)',
  })
  async inbound(@Body() dto: InboundMessageDto) {
    return { success: true, data: await this.conversationsService.handleInbound(dto) };
  }

  @Post(':id/takeover')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Human takes over a conversation' })
  async takeOver(@Param('id') id: string, @Req() req: any) {
    return {
      success: true,
      data: await this.conversationsService.takeOver(id, this.userId(req)),
    };
  }

  @Post(':id/release')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Hand a conversation back to the agent' })
  async release(@Param('id') id: string) {
    return { success: true, data: await this.conversationsService.release(id) };
  }

  @Post(':id/reply')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Human posts a reply on a conversation' })
  async reply(
    @Param('id') id: string,
    @Body() dto: HumanReplyDto,
    @Req() req: any,
  ) {
    return {
      success: true,
      data: await this.conversationsService.humanReply(id, dto, this.userId(req)),
    };
  }

  @Post(':id/close')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Close a conversation' })
  async close(@Param('id') id: string) {
    return { success: true, data: await this.conversationsService.close(id) };
  }

  @Post('actions/:actionId/approve')
  @RequirePermissions('settings.edit')
  @ApiOperation({
    summary:
      'Approve a pending money-path action (GUARDED STUB — no money moves in Phase 1)',
  })
  async approveAction(@Param('actionId') actionId: string, @Req() req: any) {
    return {
      success: true,
      data: await this.conversationsService.approveAction(actionId, this.userId(req)),
    };
  }

  @Post('actions/:actionId/reject')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Reject a pending money-path action' })
  async rejectAction(@Param('actionId') actionId: string, @Req() req: any) {
    return {
      success: true,
      data: await this.conversationsService.rejectAction(actionId, this.userId(req)),
    };
  }
}
