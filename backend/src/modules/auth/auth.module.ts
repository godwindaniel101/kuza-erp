import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { User } from '../../common/entities/user.entity';
import { Restaurant } from '../../common/entities/restaurant.entity';
import { Role } from '../../common/entities/role.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BranchesModule } from '../settings/branches/branches.module';
import { UomsModule } from '../ims/uoms/uoms.module';
import { UomConversionsModule } from '../ims/uom-conversions/uom-conversions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Restaurant, Role]),
    PassportModule,
    NotificationsModule,
    BranchesModule,
    UomsModule,
    UomConversionsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
