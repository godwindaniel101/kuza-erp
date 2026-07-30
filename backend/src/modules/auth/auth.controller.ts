import { Controller, Post, Body, Get, Delete, UseGuards, Request, Req, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto, ResendVerificationDto } from './dto/verify-email.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/guards/permissions.guard';
import { ExchangeApiTokenDto, IssueApiTokenDto } from './dto/api-token.dto';

/**
 * FRONTEND_URL is a comma-separated CORS allow-list (e.g.
 * "http://localhost:5001,http://localhost:5002"). User-facing links must use the
 * canonical app origin only — the FIRST entry — never the whole list, or the URL
 * is malformed. CORS in main.ts still consumes the full list (see there).
 */
function appOrigin(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:5001')
    .split(',')[0]
    .trim();
}

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

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'Email-first signup (step 1) — sends a verification email' })
  @ApiResponse({ status: 201, description: 'Verification email sent' })
  @ApiResponse({ status: 409, description: 'Account already exists' })
  async signup(
    @Body() dto: SignupDto,
    @I18n() i18n: I18nContext,
    @Query('lang') lang?: string,
  ) {
    const { verifyToken } = await this.authService.signup(dto.email, dto.password);

    const frontendUrl = appOrigin();
    const verifyUrl = `${frontendUrl}/verify-email?token=${verifyToken}`;
    try {
      await this.notificationsService.sendEmail({
        to: dto.email,
        subject: 'Verify your email',
        template: 'email-verification',
        context: { verifyUrl },
        lang: lang || 'en',
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail signup if the email transport is down.
    }

    return {
      success: true,
      message: 'Check your email to verify your account.',
    };
  }

  @Post('verify-email')
  @Public()
  @ApiOperation({ summary: 'Verify email (step 2) — returns an onboarding token' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(dto.token);
    return { success: true, data: result };
  }

  @Post('resend-verification')
  @Public()
  @ApiOperation({ summary: 'Resend the email verification link' })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Query('lang') lang?: string,
  ) {
    const { sent, verifyToken } = await this.authService.resendVerification(
      dto.email,
    );
    if (sent && verifyToken) {
      const frontendUrl = appOrigin();
      const verifyUrl = `${frontendUrl}/verify-email?token=${verifyToken}`;
      try {
        await this.notificationsService.sendEmail({
          to: dto.email,
          subject: 'Verify your email',
          template: 'email-verification',
          context: { verifyUrl },
          lang: lang || 'en',
        });
      } catch (error) {
        console.error('Failed to resend verification email:', error);
      }
    }
    // Never leak whether the address exists / is already verified.
    return {
      success: true,
      message: 'If that account needs verifying, a new link is on its way.',
    };
  }

  @Post('onboarding')
  @Public()
  @ApiOperation({ summary: 'Complete first-run onboarding (step 3) — provisions the business' })
  @ApiResponse({ status: 201, description: 'Business provisioned; returns a full session' })
  @ApiResponse({ status: 401, description: 'Invalid or expired onboarding token' })
  async onboarding(@Body() dto: OnboardingDto, @Query('lang') lang?: string) {
    const result = await this.authService.completeOnboarding(dto);

    // Welcome email (non-blocking).
    try {
      await this.notificationsService.sendWelcomeEmail(
        result.user.email,
        result.user.name,
        lang || 'en',
      );
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    return { success: true, data: result };
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

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const result = req.user;
    const frontendUrl = appOrigin();

    // Brand-new Google user (no account yet) → onboarding creates their
    // business + tenant, carrying a signed identity token.
    if (result?.isNew) {
      const onboardingToken = this.authService.signGoogleOnboardingToken(
        result.email,
        result.name,
        result.googleId,
      );
      return res.redirect(
        `${frontendUrl}/onboarding?provider=google&token=${onboardingToken}`,
      );
    }

    // Existing user → normal signed session token, land on the app.
    const token = this.authService.generateToken(
      result.landlordUserId,
      result.email,
      result.tenantId,
      result.isSuperAdmin === true,
    );
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

  // ------------------------------------------------------------------
  // Programmatic API tokens (used by the Kuza MCP server).
  //  - The token is validated ONLY at /exchange (below), which mints a normal
  //    tenant-scoped JWT. Every other call uses that JWT, so the global guard
  //    chain and per-tenant isolation are unchanged.
  // ------------------------------------------------------------------

  @Post('api-token/exchange')
  @Public()
  @ApiOperation({
    summary: 'Exchange a Kuza API token for a short-lived JWT (for the MCP)',
  })
  @ApiResponse({ status: 201, description: 'Returns a tenant-scoped JWT' })
  @ApiResponse({ status: 401, description: 'Invalid or revoked API token' })
  async exchangeApiToken(@Body() dto: ExchangeApiTokenDto) {
    const result = await this.authService.exchangeApiToken(dto.token);
    return { success: true, data: result };
  }

  @Post('api-token')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings.view')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Issue or rotate the current user's API token (shown once)",
  })
  @ApiResponse({ status: 201, description: 'Returns the plaintext token once' })
  async issueApiToken(@Request() req, @Body() dto: IssueApiTokenDto) {
    const result = await this.authService.issueApiToken(req.user.sub, dto.label);
    return { success: true, data: result };
  }

  @Delete('api-token')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke the current user's API token" })
  async revokeApiToken(@Request() req) {
    await this.authService.revokeApiToken(req.user.sub);
    return { success: true, message: 'API token revoked' };
  }

  @Get('api-token')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Status of the current user's API token" })
  async getApiTokenInfo(@Request() req) {
    const data = await this.authService.getApiTokenInfo(req.user.sub);
    return { success: true, data };
  }
}
