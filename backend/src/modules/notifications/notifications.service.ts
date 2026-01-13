import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
  lang?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendEmail(options: EmailOptions) {
    const { to, subject, template, context, lang = 'en' } = options;

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
    const acceptUrl = `${this.configService.get<string>('FRONTEND_URL')}/invitations/accept/${invitation.token}`;
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
}

