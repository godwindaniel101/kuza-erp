import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SnakeCaseNamingStrategy } from '@/common/database/snake-naming.strategy';

/**
 * Configuration for the landlord database
 * This database stores tenant information and authentication data
 */
export const getLandlordDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('LANDLORD_DB_NAME') || configService.get<string>('DB_LANDLORD_NAME', 'erp_landlord'),
    entities: [__dirname + '/../common/landlord/entities/*.entity{.ts,.js}'],
    autoLoadEntities: false, // Explicitly load only landlord entities
    migrations: [__dirname + '/../migrations/landlord/*{.ts,.js}'],
    synchronize: configService.get<string>('NODE_ENV') === 'development',
    logging: false,
    ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    namingStrategy: new SnakeCaseNamingStrategy(),
    name: 'landlord', // Named connection for multi-database setup
  };
};
