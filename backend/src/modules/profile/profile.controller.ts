import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('Profile')
@Controller('profile')
@UseGuardsDecorator(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@Request() req) {
    const profile = await this.profileService.getProfile(req.user.sub);
    return {
      success: true,
      data: profile,
    };
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @Request() req,
    @Body() updateDto: UpdateProfileDto,
    @I18n() i18n: I18nContext,
  ) {
    const profile = await this.profileService.updateProfile(req.user.sub, updateDto);
    return {
      success: true,
      data: profile,
      message: i18n.t('common.updated'),
    };
  }
}

