import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { getJwtSecret } from '../../../config/security.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService),
    });
  }

  async validate(payload: any) {
    // Validate using the auth service. We request full user data so that the
    // tenant-scoped roles & permissions are attached to request.user — the
    // PermissionsGuard relies on these to authorize protected endpoints.
    const user = await this.authService.validateUser(payload.sub, true);

    if (user) {
      // Return user info including tenant information and authorization data.
      return {
        sub: payload.sub, // This is the landlord user ID
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        businessId: payload.businessId, // From JWT payload
        tenant: user.tenant,
        roles: (user as any).roles || [],
        permissions: (user as any).permissions || [],
        // Platform super-admin flag comes from the signed JWT claim (source of
        // truth for SuperAdminGuard). Never trust anything client-supplied here.
        isSuperAdmin: payload.isSuperAdmin === true,
      };
    }

    // Fallback to payload if validation fails
    return payload;
  }
}

