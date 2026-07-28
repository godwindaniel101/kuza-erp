import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Landlord-scoped migration: add the API-token columns to landlord_users.
 *
 * Backs the revocable per-user API token used by the Kuza MCP server. Only the
 * SHA-256 hash of the token is stored (the plaintext is shown once). Landlord
 * (public) database only — there is NO tenant-schema change. In development the
 * landlord datasource runs with synchronize:true so the columns are created
 * automatically; this migration is the production path (synchronize disabled).
 *
 * The unique index on api_token_hash allows multiple NULLs (Postgres semantics),
 * so any number of users can have "no token" while an issued hash stays unique.
 */
export class AddApiTokenToLandlordUser1753600000000
  implements MigrationInterface
{
  name = 'AddApiTokenToLandlordUser1753600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "landlord_users" ADD COLUMN IF NOT EXISTS "api_token_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_users" ADD COLUMN IF NOT EXISTS "api_token_label" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_users" ADD COLUMN IF NOT EXISTS "api_token_created_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_users" ADD COLUMN IF NOT EXISTS "api_token_last_used_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_landlord_users_api_token_hash" ON "landlord_users" ("api_token_hash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_landlord_users_api_token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_users" DROP COLUMN IF EXISTS "api_token_last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_users" DROP COLUMN IF EXISTS "api_token_created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_users" DROP COLUMN IF EXISTS "api_token_label"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_users" DROP COLUMN IF EXISTS "api_token_hash"`,
    );
  }
}
