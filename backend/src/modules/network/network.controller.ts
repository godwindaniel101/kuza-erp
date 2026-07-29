import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NetworkService } from './network.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestPartnershipDto } from './dto/request-partnership.dto';
import { InviteSupplierDto } from './dto/invite-supplier.dto';

/**
 * Kuza Network (Phase 0) — cross-tenant B2B directory & partnerships.
 * All routes are scoped to the caller's tenant via req.user.tenantId.
 */
@ApiTags('Network')
@Controller('network')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('me')
  @ApiOperation({ summary: "Get (or create) the caller's network profile" })
  async getProfile(@Request() req: any) {
    const data = await this.networkService.getOrCreateProfile(
      req.user.tenantId,
    );
    return { success: true, data };
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the caller's network profile" })
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    const data = await this.networkService.updateProfile(
      req.user.tenantId,
      dto,
    );
    return { success: true, data };
  }

  @Get('directory')
  @ApiOperation({ summary: 'Search the network business directory' })
  async searchDirectory(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('supplierOnly') supplierOnly?: string,
  ) {
    const data = await this.networkService.searchDirectory(req.user.tenantId, {
      search,
      supplierOnly: supplierOnly === 'true' || supplierOnly === '1',
    });
    return { success: true, data };
  }

  @Get('partnerships')
  @ApiOperation({ summary: 'List the caller trade partnerships' })
  async listPartnerships(@Request() req: any) {
    const data = await this.networkService.listPartnerships(req.user.tenantId);
    return { success: true, data };
  }

  @Post('partnerships/request')
  @ApiOperation({ summary: 'Request a partnership with a supplier' })
  async requestPartnership(
    @Request() req: any,
    @Body() dto: RequestPartnershipDto,
  ) {
    const data = await this.networkService.requestPartnership(
      req.user.tenantId,
      dto,
    );
    return { success: true, data };
  }

  @Post('partnerships/:id/accept')
  @ApiOperation({ summary: 'Accept a partnership request (supplier only)' })
  async acceptPartnership(@Request() req: any, @Param('id') id: string) {
    const data = await this.networkService.respondToPartnership(
      req.user.tenantId,
      id,
      true,
    );
    return { success: true, data };
  }

  @Post('partnerships/:id/reject')
  @ApiOperation({ summary: 'Reject a partnership request (supplier only)' })
  async rejectPartnership(@Request() req: any, @Param('id') id: string) {
    const data = await this.networkService.respondToPartnership(
      req.user.tenantId,
      id,
      false,
    );
    return { success: true, data };
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a supplier by email' })
  async invite(@Request() req: any, @Body() dto: InviteSupplierDto) {
    const data = await this.networkService.invite(req.user.tenantId, dto);
    return { success: true, data };
  }
}
