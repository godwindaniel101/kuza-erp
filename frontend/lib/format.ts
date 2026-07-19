import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Shared formatting helpers for the Accounting / Sales / Billing modules.
 */

/**
 * Resolve an item image src to a loadable URL. Backend-relative uploads
 * (e.g. "/uploads/inventory/x.jpg", produced by bulk create) are served by the
 * API origin, not the frontend — prefix them so they load. data:/blob:/http(s)
 * URLs (e.g. single-create base64) pass through unchanged.
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
export function resolveImageUrl(src?: string | null): string {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return `${API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`;
}

/** Neutral image shown when an item has no photo, or its photo fails to load. */
export const ITEM_PLACEHOLDER = '/img/item-placeholder.svg';

/** Resolve an item image, always returning a src (placeholder when absent). */
export function itemImageSrc(src?: string | null): string {
  return resolveImageUrl(src) || ITEM_PLACEHOLDER;
}

/** <img onError> handler: swap a broken/failed image for the placeholder once. */
export function onItemImageError(e: { currentTarget: HTMLImageElement }): void {
  const img = e.currentTarget;
  if (img.src.endsWith(ITEM_PLACEHOLDER)) return;
  img.src = ITEM_PLACEHOLDER;
}

const currencySymbols: { [key: string]: string } = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  KES: 'KSh ',
};

/** Format an amount with currency symbol, e.g. ₦1,234.50 (sign-aware). */
export function formatMoney(amount: number | string | null | undefined, currency = 'NGN'): string {
  const n = Number(amount ?? 0);
  const symbol = currencySymbols[currency] ?? `${currency} `;
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : ''}${symbol}${abs}`;
}

/** Format a plain number with thousand separators. */
export function formatNumber(value: number | string | null | undefined, decimals = 0): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Format an ISO date string as e.g. "Jan 5, 2026". Returns '-' for empty input. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Today as YYYY-MM-DD (local time) for date inputs. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** First day of the current month as YYYY-MM-DD. */
export function firstOfMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Escape a single CSV cell. */
function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV from headers + rows and trigger a client-side blob download. No deps. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): void {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Business currency from settings (defaults to NGN while loading / on failure). */
export function useCurrency(): string {
  const [currency, setCurrency] = useState('NGN');
  useEffect(() => {
    let mounted = true;
    api
      .get<{ success: boolean; data: { currency_code?: string; currency?: string } }>('/settings')
      .then((res) => {
        if (mounted && res.success && res.data) {
          setCurrency(res.data.currency_code || res.data.currency || 'NGN');
        }
      })
      .catch(() => {
        /* keep default */
      });
    return () => {
      mounted = false;
    };
  }, []);
  return currency;
}
