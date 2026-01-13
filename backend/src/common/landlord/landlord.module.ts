import { Module, Global } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { getLandlordDatabaseConfig } from '../../config/landlord-database.config';
import { Tenant } from './entities/tenant.entity';
import { LandlordUser } from './entities/landlord-user.entity';
import { LandlordService } from './services/landlord.service';

/**
 * Landlord module - handles tenant authentication and management
 * Uses separate database connection
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: 'landlord',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getLandlordDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Tenant, LandlordUser], 'landlord'),
  ],
  providers: [
    LandlordService,
    {
      provide: 'LANDLORD_CONNECTION',
      useFactory: (dataSource: DataSource) => {
        return dataSource;
      },
      inject: [getDataSourceToken('landlord')],
    },
  ],
  exports: [LandlordService, TypeOrmModule],
})
export class LandlordModule {}
