import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SnakeCaseNamingStrategy } from '@/common/database/snake-naming.strategy';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  // Schema auto-sync is NEVER allowed in production (it can silently drop/alter
  // columns and destroy data). Production must use explicit migrations only.
  // Outside production, sync is on for development or when explicitly enabled.
  const isProd = nodeEnv === 'production';
  const synchronize = isProd
    ? false
    : nodeEnv === 'development' ||
      configService.get<string>('DB_SYNCHRONIZE') === 'true';

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_NAME', 'erp_db'),
    autoLoadEntities: true,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize,
    logging: false,
    ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    namingStrategy: new SnakeCaseNamingStrategy(),
  };
};
