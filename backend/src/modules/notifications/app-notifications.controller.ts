import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppNotificationsService } from './app-notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * In-app (in-portal) notifications inbox — the bell/feed. All routes are
 * tenant + user scoped via the JWT (req.user.id / req.user.tenantId).
 */
@ApiTags('Notifications Inbox')
@Controller('notifications/inbox')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppNotificationsController {
  constructor(
    private readonly appNotificationsService: AppNotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List recent in-app notifications' })
  async list(@Req() req: any) {
    const data = await this.appNotificationsService.list(req.user.id);
    return { success: true, data };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread in-app notification count' })
  async unreadCount(@Req() req: any) {
    const count = await this.appNotificationsService.unreadCount(req.user.id);
    return { success: true, data: { count } };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a notification read' })
  async markRead(@Param('id') id: string) {
    await this.appNotificationsService.markRead(id);
    return { success: true, data: { id } };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications read' })
  async markAllRead(@Req() req: any) {
    await this.appNotificationsService.markAllRead(req.user.id);
    return { success: true, data: { ok: true } };
  }
}
