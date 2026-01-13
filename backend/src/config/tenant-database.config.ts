import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SnakeCaseNamingStrategy } from '@/common/database/snake-naming.strategy';

/**
 * Configuration for tenant databases
 * This will be dynamically configured based on the tenant
 */
export const getTenantDatabaseConfig = (
  configService: ConfigService,
  schemaName?: string,
  databaseName?: string,
): TypeOrmModuleOptions => {
  const baseDatabase = configService.get<string>('DB_NAME', 'erp_db');
  
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: databaseName || baseDatabase, // Use tenant-specific database if provided
    schema: schemaName, // Use tenant-specific schema if provided
    autoLoadEntities: true,
    migrations: [__dirname + '/../migrations/tenant/*{.ts,.js}'],
    synchronize: configService.get<string>('NODE_ENV') === 'development',
    logging: false,
    ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    namingStrategy: new SnakeCaseNamingStrategy(),
    name: 'tenant', // Named connection for tenant database
  };
};
