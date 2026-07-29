import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { MenuSiteTenantGuard } from '../../menu-sites/guards/menu-site-tenant.guard';
import { ReservationsService } from './reservations.service';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';

/**
 * UNAUTHENTICATED guest booking from the public menu page. Mirrors the public
 * menu endpoint: @Public() opts out of auth; MenuSiteTenantGuard resolves the
 * :slug → tenant and pins the schema so the reservation lands in the right
 * tenant. Creates a 'pending' request the venue confirms.
 */
@ApiTags('Public Reservations')
@Public()
@Controller('public/reservations')
@UseGuards(MenuSiteTenantGuard)
export class PublicReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post(':slug')
  @ApiOperation({ summary: 'Request a reservation from a published venue slug' })
  async book(
    @Param('slug') _slug: string,
    @Body() dto: CreatePublicReservationDto,
  ) {
    const data = await this.reservationsService.createPublic(dto);
    return { success: true, data };
  }
}
