import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './reservations.controller';
import { PublicReservationsController } from './reservations-public.controller';
import { ReservationsService } from './reservations.service';
import { Reservation } from './entities/reservation.entity';
import { Business } from '../../../common/entities/business.entity';
import { MenuSlugRoute } from '../../menu-sites/entities/menu-slug-route.entity';
import { MenuSiteTenantGuard } from '../../menu-sites/guards/menu-site-tenant.guard';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Business]),
    TypeOrmModule.forFeature([MenuSlugRoute], 'landlord'),
    NotificationsModule,
  ],
  controllers: [ReservationsController, PublicReservationsController],
  providers: [ReservationsService, MenuSiteTenantGuard],
})
export class ReservationsModule {}
