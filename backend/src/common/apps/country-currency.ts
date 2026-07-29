/**
 * Country → billing currency mapping (GTM decision: local-first pricing —
 * the registration country sets the currency every plan price is shown and
 * billed in). Extend alongside the register page's featuredCountries list.
 */
export const COUNTRY_CURRENCY: Record<string, string> = {
  NG: 'NGN',
  GH: 'GHS',
  KE: 'KES',
  BJ: 'XOF',
  GB: 'GBP',
  US: 'USD',
  FR: 'EUR',
};

export const DEFAULT_CURRENCY = 'NGN';

export function currencyForCountry(country?: string | null): string {
  if (!country) {
    return DEFAULT_CURRENCY;
  }
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? 'USD';
}
