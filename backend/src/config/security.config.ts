import { ConfigService } from '@nestjs/config';

/**
 * Known insecure default secrets that must never be used to sign tokens
 * in a real environment. Shipped historically in code/compose defaults.
 */
const INSECURE_JWT_DEFAULTS = [
  'your-secret-key',
  'your-secret-key-change-in-production',
  'dev-secret-key',
];

const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-do-not-use-in-prod';

/**
 * Resolves the JWT signing secret with fail-fast guarantees.
 *
 * - Production: throws on a missing, default, or weak (<32 char) secret so the
 *   app refuses to boot rather than signing forgeable tokens.
 * - Non-production: warns loudly and falls back to a dev-only secret so local
 *   development is frictionless without ever leaking into production.
 */
export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProd = nodeEnv === 'production';

  const isMissingOrDefault =
    !secret || INSECURE_JWT_DEFAULTS.includes(secret);

  if (isMissingOrDefault) {
    if (isProd) {
      throw new Error(
        'FATAL: JWT_SECRET is missing or set to a known insecure default. ' +
          'Set JWT_SECRET to a strong, unique value (>= 32 chars) before starting in production.',
      );
    }
    // eslint-disable-next-line no-console
    console.warn(
      '[SECURITY] JWT_SECRET is missing or using an insecure default. ' +
        'Falling back to a development-only secret. NEVER deploy this to production.',
    );
    return secret || DEV_FALLBACK_SECRET;
  }

  if (isProd && secret.length < 32) {
    throw new Error(
      'FATAL: JWT_SECRET must be at least 32 characters in production.',
    );
  }

  return secret;
}
