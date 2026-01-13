import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test-email')
  @ApiOperation({ summary: 'Send test email' })
  async sendTestEmail(@Body() body: { email: string; lang?: string }) {
    await this.notificationsService.sendWelcomeEmail(body.email, 'Test User', body.lang || 'en');
    return { success: true, message: 'Test email sent' };
  }
}

