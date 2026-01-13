import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SnakeCaseNamingStrategy } from '@/common/database/snake-naming.strategy';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  // Enable synchronize for development or if explicitly enabled
  // In production, you should use migrations instead
  const synchronize = nodeEnv === 'development' || configService.get<string>('DB_SYNCHRONIZE') === 'true';
  
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
