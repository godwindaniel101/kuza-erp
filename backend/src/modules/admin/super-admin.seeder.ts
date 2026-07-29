import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LandlordService } from '../../common/landlord/services/landlord.service';

/**
 * Seeds the initial platform super-admin on boot.
 *
 * On module init, if SUPER_ADMIN_EMAIL is set, promotes the matching landlord
 * user to isSuperAdmin=true (idempotent). It NEVER creates a user, never
 * hardcodes credentials, and installs no bypass — if the env var is unset or no
 * user matches, it is a no-op. Failures are logged and swallowed so a seeding
 * hiccup cannot block application startup.
 */
@Injectable()
export class SuperAdminSeeder implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  constructor(
    private readonly landlordService: LandlordService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.configService.get<string>('SUPER_ADMIN_EMAIL');
    if (!email) {
      return;
    }

    try {
      const result = await this.landlordService.ensureSuperAdminByEmail(email);
      switch (result) {
        case 'promoted':
          this.logger.log(`Promoted ${email} to platform super-admin.`);
          break;
        case 'already':
          this.logger.log(`${email} is already a platform super-admin.`);
          break;
        case 'not-found':
          this.logger.warn(
            `SUPER_ADMIN_EMAIL is set to ${email} but no landlord user matches — no super-admin was seeded.`,
          );
          break;
      }
    } catch (error) {
      this.logger.error(
        `Failed to seed super-admin for ${email}: ${(error as Error).message}`,
      );
    }
  }
}
