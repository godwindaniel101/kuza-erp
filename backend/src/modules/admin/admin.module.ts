import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperAdminSeeder } from './super-admin.seeder';

/**
 * Platform super-admin back-office module.
 *
 * Depends only on LandlordService and BillingService, both provided by @Global
 * modules (LandlordModule, BillingModule), so no explicit imports are needed.
 * The controller is gated by JwtAuthGuard + SuperAdminGuard; the seeder promotes
 * the SUPER_ADMIN_EMAIL user on boot (ConfigModule is global).
 */
@Module({
  controllers: [AdminController],
  providers: [AdminService, SuperAdminSeeder],
})
export class AdminModule {}
