import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Landlord-scoped migration: add landlord_users.is_super_admin.
 *
 * Backs the platform super-admin boundary. Landlord (public) database only —
 * there is NO tenant-schema change. In development the landlord datasource
 * runs with synchronize:true so the column is created automatically; this
 * migration is the production path (synchronize is disabled there).
 */
export class AddIsSuperAdminToLandlordUser1752624000000
  implements MigrationInterface
{
  name = 'AddIsSuperAdminToLandlordUser1752624000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "landlord_users" ADD COLUMN IF NOT EXISTS "is_super_admin" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "landlord_users" DROP COLUMN IF EXISTS "is_super_admin"`,
    );
  }
}
