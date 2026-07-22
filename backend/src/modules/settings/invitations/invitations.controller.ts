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
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('invitations.create')
  @ApiOperation({ summary: 'Create invitation' })
  async create(@Request() req, @Body() createDto: CreateInvitationDto, @I18n() i18n: I18nContext) {
    const invitation = await this.invitationsService.create(
      req.user.id, // invitedById (landlord user ID)
      req.user.tenantId, // tenantId
      createDto,
    );
    return {
      success: true,
      data: invitation,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('invitations.view')
  @ApiOperation({ summary: 'Get all invitations' })
  async findAll(@Request() req) {
    const invitations = await this.invitationsService.findAll();
    return {
      success: true,
      data: invitations,
    };
  }

  @Get(':id')
  @UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('invitations.view')
  @ApiOperation({ summary: 'Get invitation by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const invitation = await this.invitationsService.findOne(id);
    return {
      success: true,
      data: invitation,
    };
  }

  @Post(':id/resend')
  @UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('invitations.create')
  @ApiOperation({ summary: 'Resend invitation' })
  async resend(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    const invitation = await this.invitationsService.resend(id);
    return {
      success: true,
      data: invitation,
      message: i18n.t('common.sent'),
    };
  }

  @Delete(':id')
  @UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('invitations.delete')
  @ApiOperation({ summary: 'Cancel invitation' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.invitationsService.remove(id);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }

  // Public endpoint for accepting invitations (no auth required)
  @Post('accept/:token')
  @ApiOperation({ summary: 'Accept invitation by token' })
  async acceptInvitation(
    @Param('token') token: string,
    @Body() body: { password: string; name?: string },
    @I18n() i18n: I18nContext
  ) {
    const result = await this.invitationsService.accept(token, body.password, body.name);
    return {
      success: true,
      data: result,
      message: i18n.t('invitations.accepted'),
    };
  }
}

