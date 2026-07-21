import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { I18nValidationPipe } from 'nestjs-i18n';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
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

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Increase body size limit for image uploads (50MB)
  app.use(require('body-parser').json({ limit: '50mb' }));
  app.use(require('body-parser').urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS. FRONTEND_URL may be a comma-separated allow-list. In non-prod
  // we also allow any localhost/127.0.0.1 port so a dev port change (e.g. 5001)
  // never breaks the app with an opaque "Network Error".
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true); // same-origin, curl, mobile apps
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
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

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ERP Platform API')
    .setDescription('Complete ERP Platform API Documentation')
    .setVersion('2.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4001;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
