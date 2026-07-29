import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * TypeORM CLI data-source for the LANDLORD database (erp_landlord).
 *
 * The landlord connection runs with synchronize:true in development but MUST use
 * migrations in production (see landlord-database.config.ts). This standalone
 * data-source is what the CLI uses to run/revert/generate the landlord-scoped
 * migrations in `src/migrations/landlord/`:
 *
 *   npm run migration:run:landlord      # apply pending landlord migrations
 *   npm run migration:revert:landlord   # roll back the last one
 *   npm run migration:generate:landlord # diff entities → new migration
 *
 * Kept separate from data-source.ts (the tenant/public DB) because the two
 * databases have independent migration histories.
 */
export const LandlordDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_LANDLORD_NAME || 'erp_landlord',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/landlord/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
