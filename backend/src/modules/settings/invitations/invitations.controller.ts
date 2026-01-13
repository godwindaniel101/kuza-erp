import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('Settings - Invitations')
@Controller('invitations')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @RequirePermissions('invitations.create')
  @ApiOperation({ summary: 'Create invitation' })
  async create(@Request() req, @Body() createDto: CreateInvitationDto, @I18n() i18n: I18nContext) {
    const invitation = await this.invitationsService.create(
      req.user.businessId,
      req.user.sub,
      createDto,
    );
    return {
      success: true,
      data: invitation,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('invitations.view')
  @ApiOperation({ summary: 'Get all invitations' })
  async findAll(@Request() req) {
    const invitations = await this.invitationsService.findAll(req.user.businessId);
    return {
      success: true,
      data: invitations,
    };
  }

  @Get(':id')
  @RequirePermissions('invitations.view')
  @ApiOperation({ summary: 'Get invitation by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const invitation = await this.invitationsService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: invitation,
    };
  }

  @Post(':id/resend')
  @RequirePermissions('invitations.create')
  @ApiOperation({ summary: 'Resend invitation' })
  async resend(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    const invitation = await this.invitationsService.resend(id, req.user.businessId);
    return {
      success: true,
      data: invitation,
      message: i18n.t('common.sent'),
    };
  }

  @Delete(':id')
  @RequirePermissions('invitations.delete')
  @ApiOperation({ summary: 'Cancel invitation' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.invitationsService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}

