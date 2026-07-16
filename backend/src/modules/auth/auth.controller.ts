import { Controller, Post, Body, Get, UseGuards, Request, Req, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto, @I18n() i18n: I18nContext, @Query('lang') lang?: string) {
    const result = await this.authService.register(registerDto);
    
    // Send welcome email (non-blocking - don't fail registration if email fails)
    try {
      const emailResult = await this.notificationsService.sendWelcomeEmail(
        result.user.email,
        result.user.name,
        lang || 'en',
      );
      if (!emailResult?.success) {
        console.warn('Welcome email was not sent:', emailResult?.error || 'Unknown error');
      }
    } catch (error) {
      // Additional safety net - catch any unexpected errors
      console.error('Failed to send welcome email:', error);
      console.error('Error stack:', error?.stack);
      // Don't fail registration if email fails
    }

    return {
      success: true,
      data: result,
      message: i18n.t('auth.register_success'),
    };
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @I18n() i18n: I18nContext) {
    const result = await this.authService.login(loginDto);
    return {
      success: true,
      data: result,
      message: i18n.t('auth.login_success'),
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    const token = this.authService.generateToken(
      user.id,
      user.email,
      user.tenantId,
    );

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'User data retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req) {
    const user = await this.authService.validateUser(req.user.sub, true);
    return {
      // Expose the platform super-admin flag (from the signed JWT claim) so the
      // client can reveal the /admin back-office entry point. Server-side access
      // is still enforced independently by SuperAdminGuard.
      success: true,
      data: { ...user, isSuperAdmin: req.user?.isSuperAdmin === true },
    };
  }
}
