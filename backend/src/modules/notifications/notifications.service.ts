import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';
import { BrevoEmailProvider } from './adapters/brevo.adapter';
import { getBrevoTemplateId } from './brevo-templates.map';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
  lang?: string;
  replyTo?: string;
  cc?: string[];
  senderName?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
    private brevoProvider: BrevoEmailProvider,
  ) {}

  private readonly logger = new Logger(NotificationsService.name);

  /**
   * Render one of the app's Handlebars email templates to an HTML string, so
   * the Brevo path can send real mail without a Brevo-side template. Tries
   * `<name>.<lang>.hbs` then `<name>.en.hbs` across the same candidate dirs the
   * MailerModule uses. Returns null if no template file is found/renderable.
   */
  private renderTemplate(
    template: string,
    lang: string,
    context: Record<string, any>,
  ): string | null {
    const dirs = [
      join(process.cwd(), 'templates'),
      join(process.cwd(), 'src/modules/notifications/templates'),
      join(__dirname, 'templates'),
      join(__dirname, '../../src/modules/notifications/templates'),
    ];
    const names = [`${template}.${lang}.hbs`, `${template}.en.hbs`];
    for (const dir of dirs) {
      for (const name of names) {
        const file = join(dir, name);
        try {
          if (fs.existsSync(file)) {
            return Handlebars.compile(fs.readFileSync(file, 'utf8'))(context);
          }
        } catch (err) {
          this.logger.error(
            `Failed rendering template ${file}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }
    return null;
  }

  async sendEmail(options: EmailOptions) {
    const { to, subject, template, context, lang = 'en' } = options;

    // Route through Brevo when explicitly enabled + keyed. Prefer sending the
    // app's OWN rendered HTML (no dependency on a Brevo-side template existing),
    // falling back to a mapped Brevo template ID, then to the SMTP path.
    const provider = this.configService.get<string>('EMAIL_PROVIDER');
    const brevoApiKey = this.configService.get<string>('BREVO_API_KEY');

    if (provider === 'brevo' && brevoApiKey) {
      // Brevo transactional sends target a single recipient; use the first
      // address when an array is supplied.
      const recipient = Array.isArray(to) ? to[0] : to;
      // Prefer the account's Brevo template (managed in the Brevo UI). Fall back
      // to the app's own rendered HTML, then to the SMTP path.
      const brevoTemplateId = getBrevoTemplateId(this.configService, template);
      if (typeof brevoTemplateId === 'number') {
        return this.brevoProvider.sendTemplate({
          to: recipient,
          templateId: brevoTemplateId,
          params: context || {},
          replyTo: options.replyTo,
          cc: options.cc,
          senderName: options.senderName,
        });
      }
      const html = this.renderTemplate(template, lang, context || {});
      if (html) {
        return this.brevoProvider.sendRaw({
          to: recipient,
          subject,
          html,
          replyTo: options.replyTo,
          cc: options.cc,
          senderName: options.senderName,
        });
      }
      // else fall through to the SMTP path below
    }

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: `${template}.${lang}`, // The HandlebarsAdapter will automatically append .hbs
        context,
      });
      return { success: true };
    } catch (error) {
      // Log error but don't crash the app
      console.error('Email sending failed:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        path: error?.path,
        stack: error?.stack,
      });
      // Return error result instead of throwing
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  async sendWelcomeEmail(email: string, name: string, lang: string = 'en') {
    try {
      return await this.sendEmail({
        to: email,
        subject: lang === 'es' ? 'Bienvenido' : lang === 'fr' ? 'Bienvenue' : 'Welcome',
        template: 'welcome',
        context: { name },
        lang,
      });
    } catch (error) {
      // Double-layer error handling to prevent any unhandled errors
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error?.message || 'Failed to send welcome email' };
    }
  }

  async sendInvitation(invitation: any, lang: string = 'en') {
    // The accept URL is built once, in sendInvitationEmail, using the canonical
    // query-string format: `${FRONTEND_URL}/invitations/accept?token=${token}`.
    return this.sendInvitationEmail(
      invitation.email,
      invitation.token,
      invitation.inviter?.name || 'Administrator',
      lang,
    );
  }

  async sendPasswordResetEmail(email: string, resetToken: string, lang: string = 'en') {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    return this.sendEmail({
      to: email,
      subject: lang === 'es' ? 'Restablecer contraseña' : lang === 'fr' ? 'Réinitialiser le mot de passe' : 'Reset Password',
      template: 'password-reset',
      context: { resetUrl },
      lang,
    });
  }

  async sendInvitationEmail(email: string, invitationToken: string, inviterName: string, lang: string = 'en') {
    const invitationUrl = `${this.configService.get<string>('FRONTEND_URL')}/invitations/accept?token=${invitationToken}`;
    return this.sendEmail({
      to: email,
      subject: lang === 'es' ? 'Invitación' : lang === 'fr' ? 'Invitation' : 'Invitation',
      template: 'invitation',
      context: { invitationUrl, inviterName },
      lang,
    });
  }

  async sendLeaveRequestNotification(
    email: string,
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    lang: string = 'en',
  ) {
    return this.sendEmail({
      to: email,
      subject: lang === 'es' ? 'Solicitud de permiso' : lang === 'fr' ? 'Demande de congé' : 'Leave Request',
      template: 'leave-request',
      context: { employeeName, leaveType, startDate, endDate },
      lang,
    });
  }

  async sendOrderConfirmation(email: string, orderNumber: string, totalAmount: number, lang: string = 'en') {
    return this.sendEmail({
      to: email,
      subject: lang === 'es' ? 'Confirmación de pedido' : lang === 'fr' ? 'Confirmation de commande' : 'Order Confirmation',
      template: 'order-confirmation',
      context: { orderNumber, totalAmount },
      lang,
    });
  }

  async sendInvoiceEmail(input: {
    to: string;
    subject: string;
    replyTo?: string;
    cc?: string[];
    senderName?: string;
    context: Record<string, any>;
  }) {
    return this.sendEmail({
      to: input.to,
      subject: input.subject,
      template: 'invoice',
      context: input.context,
      replyTo: input.replyTo,
      cc: input.cc,
      senderName: input.senderName,
    });
  }

  async sendSupplierInvite(input: {
    to: string;
    context: { inviterBusinessName: string; inviteUrl: string; note?: string };
  }) {
    return this.sendEmail({
      to: input.to,
      subject: `Join ${input.context.inviterBusinessName} on Kuza`,
      template: 'supplier-invite',
      context: input.context,
    });
  }

  async sendPartnershipRequest(input: {
    to: string;
    context: { buyerBusinessName: string; note?: string; actionUrl: string };
  }) {
    return this.sendEmail({
      to: input.to,
      subject: `${input.context.buyerBusinessName} wants to buy from you on Kuza`,
      template: 'partnership-request',
      context: input.context,
    });
  }
}

