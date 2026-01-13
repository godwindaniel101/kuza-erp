import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../common/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    // Load user relations to make roles available on request.user
    try {
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['roles', 'roles.permissions', 'restaurant', 'employee'],
      });

      if (user) {
        return {
          sub: user.id,
          email: user.email,
          businessId: user.businessId,
          employeeId: user.employee?.id,
          roles: user.roles,
        };
      }
    } catch (e) {
      // Fallback to payload if DB not reachable for some reason
    }

    return payload;
  }
}

