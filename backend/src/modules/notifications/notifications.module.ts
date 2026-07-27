import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { BrevoEmailProvider } from './adapters/brevo.adapter';
import { EMAIL_PROVIDER } from './email-provider.port';
import { AppNotification } from './entities/app-notification.entity';
import { AppNotificationsService } from './app-notifications.service';
import { AppNotificationsController } from './app-notifications.controller';
import { join } from 'path';
import { existsSync } from 'fs';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mailUser = configService.get<string>('MAIL_USER');
        const mailPassword = configService.get<string>('MAIL_PASSWORD');
        
        const transport: any = {
          host: configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
          port: configService.get<number>('MAIL_PORT', 587),
          secure: configService.get<string>('MAIL_SECURE') === 'true',
        };

        // Only add auth if both user and password are provided
        if (mailUser && mailPassword) {
          transport.auth = {
            user: mailUser,
            pass: mailPassword,
          };
        }

        // Resolve template directory - check multiple possible paths
        // After webpack build, templates are copied to specific locations
        const possibleTemplatePaths = [
          '/app/templates',  // Docker production (absolute, copied by Dockerfile)
          '/app/src/modules/notifications/templates',  // Docker development/source (absolute)
          join(process.cwd(), 'templates'),  // Local production (relative to app root)
          join(process.cwd(), 'src/modules/notifications/templates'),  // Local development
          join(__dirname, 'templates'),  // Fallback: relative to compiled module
          join(__dirname, '../../src/modules/notifications/templates'),  // Fallback: development structure
        ];

        let templateDir: string | null = null;
        
        // Find first existing path
        for (const path of possibleTemplatePaths) {
          if (existsSync(path)) {
            templateDir = path;
            console.log(`✅ Found email templates at: ${templateDir}`);
            break;
          }
        }

        // If no path found, use the most likely one based on __dirname
        if (!templateDir) {
          if (__dirname.includes('dist')) {
            // We're in the built version
            templateDir = join(__dirname, 'templates');
          } else {
            // We're in source
            templateDir = join(__dirname, '../../src/modules/notifications/templates');
          }
          console.log(`⚠️  Using fallback template path: ${templateDir}`);
        }

        // Ensure templateDir is an absolute path
        const absoluteTemplateDir = templateDir.startsWith('/') 
          ? templateDir 
          : join(process.cwd(), templateDir);

        return {
          transport,
          defaults: {
            from: `"${configService.get<string>('MAIL_FROM_NAME', 'ERP Platform')}" <${configService.get<string>('MAIL_FROM')}>`,
          },
          template: {
            dir: absoluteTemplateDir,
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([AppNotification]),
  ],
  controllers: [NotificationsController, AppNotificationsController],
  providers: [
    NotificationsService,
    AppNotificationsService,
    BrevoEmailProvider,
    { provide: EMAIL_PROVIDER, useExisting: BrevoEmailProvider },
  ],
  exports: [NotificationsService, AppNotificationsService],
})
export class NotificationsModule {}

