/**
 * Small, pure POS helpers. Kept effect-free so the panels stay presentational.
 * Consumes the design tokens for the category accent palette so product tiles
 * read as one system in both light and dark.
 */
import tokens from '@/lib/design/tokens';
import type { CartLine, PosProduct } from './types';

/** Naira, always 2dp — matches the legacy order flow's formatting. */
export function formatNaira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Up-to-2dp, trailing zeros trimmed — for quantities & stock counts. */
export function formatQty(qty: number): string {
  return Number(qty || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** First 1–2 letters for the tile avatar. */
export function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * How many whole units of `uomId` the current base stock can satisfy.
 * Mirrors the legacy `Math.floor(stockInBase / multiplier)` availability math.
 */
export function availableInUom(
  stockBase: number,
  uomToBase: Record<string, number>,
  uomId: string,
): number {
  const multiplier = uomToBase?.[uomId] || 1;
  if (multiplier <= 0) return 0;
  return Math.floor(Number(stockBase || 0) / multiplier);
}

/** Deterministic accent per category so tiles are scannable by colour. */
const ACCENT_SCALES = [
  tokens.colors.primary,
  tokens.colors.info,
  tokens.colors.accent,
  tokens.colors.success,
  tokens.colors.warning,
  tokens.colors.danger,
] as const;

export interface CategoryAccent {
  /** Soft tint fill (light). */
  fill: string;
  /** Text/glyph colour that reads on the fill. */
  ink: string;
  /** Solid dot / rail colour. */
  solid: string;
}

export function categoryAccent(key: string | null | undefined): CategoryAccent {
  const label = key || 'Uncategorised';
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  const scale = ACCENT_SCALES[hash % ACCENT_SCALES.length];
  return { fill: scale[50], ink: scale[700], solid: scale[600] };
}

/** Turn a product + chosen UOM into a fresh cart line. */
export function lineFromProduct(product: PosProduct, uomId?: string): CartLine {
  const chosen = uomId || product.defaultUomId || product.baseUomId || product.uoms[0]?.id || '';
  const unitPrice =
    product.uomPrices?.[chosen] ?? product.price ?? 0;
  return {
    productId: product.id,
    name: product.name,
    category: product.category,
    uomId: chosen,
    uoms: product.uoms || [],
    uomToBase: product.uomToBase || {},
    uomPrices: product.uomPrices || {},
    unitPrice,
    quantity: 1,
    stockBase: Number(product.stock || 0),
  };
}
