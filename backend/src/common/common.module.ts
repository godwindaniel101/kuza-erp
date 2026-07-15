import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from '../config/database.config';
import { TenantService } from './services/tenant.service';
import { User } from './entities/user.entity';
import { Business } from './entities/business.entity';
import { Branch } from './entities/branch.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { Invitation } from './entities/invitation.entity';
import { AuditLog } from './audit/audit-log.entity';
import { AuditLogService } from './audit/audit-log.service';
import { AuditLogInterceptor } from './audit/audit-log.interceptor';
import { AuditLogsController } from './audit/audit-logs.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Business, Branch, Role, Permission, Invitation, AuditLog]),
  ],
  controllers: [AuditLogsController],
  providers: [
    TenantService,
    AuditLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  exports: [TenantService, AuditLogService, TypeOrmModule],
})
export class CommonModule {}
