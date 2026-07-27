import { ConfigService } from '@nestjs/config';

/**
 * Maps the app's template NAMES to numeric Brevo template IDs.
 *
 * Each entry is overridable at runtime via env (e.g. BREVO_TEMPLATE_WELCOME),
 * falling back to the proposed default below. Template names mirror the
 * Handlebars template names used on the SMTP path so the same `EmailOptions`
 * can route through either provider unchanged.
 */
// Defaults match the live Brevo account's template IDs (verified 2026-07-24).
// Override per-template via the env var if the account changes.
export const BREVO_TEMPLATE_ENV: Record<string, { env: string; default: number }> = {
  welcome: { env: 'BREVO_TEMPLATE_WELCOME', default: 4 },
  invitation: { env: 'BREVO_TEMPLATE_INVITATION', default: 5 },
  'password-reset': { env: 'BREVO_TEMPLATE_PASSWORD_RESET', default: 6 },
  'reservation-confirmation': { env: 'BREVO_TEMPLATE_RESERVATION_CONFIRMATION', default: 7 },
  invoice: { env: 'BREVO_TEMPLATE_INVOICE', default: 8 },
  'supplier-invite': { env: 'BREVO_TEMPLATE_SUPPLIER_INVITE', default: 9 },
  'partnership-request': { env: 'BREVO_TEMPLATE_PARTNERSHIP_REQUEST', default: 10 },
};

/**
 * Resolve the numeric Brevo template ID for a template name, honouring the
 * per-template env override. Returns undefined when the name is not mapped
 * (so the caller can fall back to the SMTP/Handlebars path).
 */
export function getBrevoTemplateId(
  config: ConfigService,
  templateName: string,
): number | undefined {
  const entry = BREVO_TEMPLATE_ENV[templateName];
  if (!entry) return undefined;
  const raw = config.get<string | number>(entry.env);
  if (raw === undefined || raw === null || raw === '') return entry.default;
  const parsed = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? parsed : entry.default;
}
