/**
 * Port for transactional-email providers (Brevo, SMTP, ...).
 *
 * Adapters implement this so NotificationsService can delegate template sends
 * without knowing the concrete provider. Keeps the public NotificationsService
 * API stable while the underlying delivery mechanism is swappable via config.
 */
export interface EmailProviderPort {
  sendTemplate(input: {
    to: string;
    templateId: number;
    params: Record<string, any>;
    replyTo?: string;
    cc?: string[];
    senderName?: string;
    senderEmail?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/** DI token for the active EmailProviderPort implementation. */
export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';
