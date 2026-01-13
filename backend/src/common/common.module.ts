import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from '../config/database.config';
import { TenantService } from './services/tenant.service';
import { User } from './entities/user.entity';
import { Restaurant } from './entities/restaurant.entity';
import { Branch } from './entities/branch.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { Invitation } from './entities/invitation.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Restaurant, Branch, Role, Permission, Invitation]),
  ],
  providers: [TenantService],
  exports: [TenantService, TypeOrmModule],
})
export class CommonModule {}
