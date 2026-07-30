import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { I18nValidationPipe } from 'nestjs-i18n';
import { initializeTransactionalContext } from 'typeorm-transactional';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { join } from 'path';

async function bootstrap() {
  // Error tracking. No-op unless SENTRY_DSN is set, so local/dev never crashes
  // on a missing DSN and prod opt-in is just an env var away.
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
  }

  // Must run before any DataSource is created so the transactional context
  // (AsyncLocalStorage) can pin a single DB connection per request. This is
  // what makes per-tenant schema isolation reliable under connection pooling.
  initializeTransactionalContext();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
    // rawBody is required for byte-exact HMAC verification of provider
    // webhooks (Paystack/Monnify signatures are computed over the raw bytes).
    rawBody: true,
  });

  // Security headers. contentSecurityPolicy is disabled so Swagger UI's inline
  // assets keep loading in dev; the rest of helmet's hardening still applies.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Global body size limit. 10MB covers the largest need — the IMS bulk-upload
  // route (POST /ims/inventory/bulk-upload) takes a JSON { csv } string that may
  // embed base64 images. If a future route needs more, scope a larger limit to
  // that route rather than raising this global ceiling.
  app.use(require('body-parser').json({ limit: '10mb' }));
  app.use(require('body-parser').urlencoded({ limit: '10mb', extended: true }));

  // Open CORS — reflect ANY origin. Requested to unblock cross-origin calls from
  // every frontend (deployed portals, previews, dev hosts) without maintaining an
  // allow-list. The exact request origin is echoed back, never the wildcard '*',
  // so credentialed requests keep working. Auth here is a Bearer token in the
  // Authorization header (not an ambient cookie), so reflecting all origins does
  // not open a classic CSRF hole — revisit this if cookie-based auth is added.
  // FRONTEND_URL is still logged for reference (it drives verify-email links).
  const corsLogger = new Logger('CORS');
  const frontendUrl = process.env.FRONTEND_URL || '(unset)';
  corsLogger.log(
    `Open CORS active — reflecting all origins (isProd=${process.env.NODE_ENV === 'production'}). FRONTEND_URL=${frontendUrl}`,
  );
  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      // A `[CORS]` line proves the request reached the app. If a browser reports a
      // CORS error but NO `[CORS]` line appears, the request never reached Nest —
      // that is an infra problem (proxy/host stripping headers), not the app.
      corsLogger.debug(`origin=${origin ?? '(none)'} -> ALLOW (open CORS)`);
      cb(null, true);
    },
    credentials: true,
  });

  // Global exception filter for detailed error messages
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe with i18n and detailed error messages
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation — served everywhere except production to avoid
  // exposing the full API surface publicly.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ERP Platform API')
      .setDescription('Complete ERP Platform API Documentation')
      .setVersion('2.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Base ping at the service root (outside the /api prefix) — a friendly 200
  // for anyone hitting the backend URL directly.
  app
    .getHttpAdapter()
    .getInstance()
    .get('/', (_req: Request, res: Response) => {
      res.status(200).send(`Kuza Backend API 🚀 - v1.0.1`);
    });

  const port = process.env.PORT || 4001;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
