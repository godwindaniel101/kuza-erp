import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProviderPort } from '../email-provider.port';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Brevo (Sendinblue) transactional-email adapter.
 *
 * POSTs to the Brevo v3 transactional endpoint using the app's Brevo template
 * IDs. Errors are logged and swallowed (returns { success:false, error }) so a
 * mail failure never crashes a caller — mirroring the SMTP path's behaviour.
 *
 * Uses the native `fetch` (Node 18+), consistent with the payment adapters in
 * src/modules/integrations/adapters, which also use fetch rather than axios.
 */
@Injectable()
export class BrevoEmailProvider implements EmailProviderPort {
  private readonly logger = new Logger(BrevoEmailProvider.name);

  constructor(private readonly config: ConfigService) {}

  async sendTemplate(input: {
    to: string;
    templateId: number;
    params: Record<string, any>;
    replyTo?: string;
    cc?: string[];
    senderName?: string;
    senderEmail?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, templateId, params, replyTo, cc, senderName, senderEmail } = input;
    return this.post(
      {
        ...this.sender(senderName, senderEmail),
        to: [{ email: to }],
        templateId,
        params,
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        ...(cc && cc.length ? { cc: cc.map((e) => ({ email: e })) } : {}),
      },
      `template ${templateId}`,
    );
  }

  /**
   * Send a pre-rendered HTML email (no Brevo-side template required). The app
   * renders its own Handlebars templates and delivers the HTML here, so real
   * mail sends even when the Brevo account has no matching template.
   */
  async sendRaw(input: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
    cc?: string[];
    senderName?: string;
    senderEmail?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, html, replyTo, cc, senderName, senderEmail } = input;
    return this.post(
      {
        ...this.sender(senderName, senderEmail),
        to: [{ email: to }],
        subject,
        htmlContent: html,
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        ...(cc && cc.length ? { cc: cc.map((e) => ({ email: e })) } : {}),
      },
      'raw html',
    );
  }

  private sender(name?: string, email?: string): { sender: { name?: string; email?: string } } {
    return {
      sender: {
        name: name || this.config.get<string>('BREVO_SENDER_NAME') || this.config.get<string>('MAIL_FROM_NAME'),
        email: email || this.config.get<string>('BREVO_SENDER_EMAIL') || this.config.get<string>('MAIL_FROM'),
      },
    };
  }

  private async post(
    body: Record<string, any>,
    label: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      const error = 'BREVO_API_KEY is not configured';
      this.logger.error(error);
      return { success: false, error };
    }
    try {
      const res = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = data?.message || data?.code || `Brevo responded with HTTP ${res.status}`;
        this.logger.error(`Brevo send failed (${label}): ${error}`);
        return { success: false, error };
      }
      return { success: true, messageId: data?.messageId };
    } catch (error: any) {
      this.logger.error(`Brevo send failed (${label}): ${error?.message || error}`);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }
}
