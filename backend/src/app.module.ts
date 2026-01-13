import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { I18nModule } from 'nestjs-i18n';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { i18nConfig } from './config/i18n.config';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RmsModule } from './modules/rms/rms.module';
import { ImsModule } from './modules/ims/ims.module';
import { HrmsModule } from './modules/hrms/hrms.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ProfileModule } from './modules/profile/profile.module';
import { CommonModule } from './common/common.module';
import { LandlordModule } from './common/landlord/landlord.module';
import { TenantModule } from './common/tenant/tenant.module';
import { AppController } from './app.controller';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    I18nModule.forRoot(i18nConfig()),
    LandlordModule,
    TenantModule,
    CommonModule,
    AuthModule,
    UsersModule,
    RmsModule,
    ImsModule,
    HrmsModule,
    NotificationsModule,
    DashboardModule,
    SettingsModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

