import { useEffect, useState } from 'react';
import {
  fetchInsightsSummary,
  type InsightItem,
  type InsightTone,
  type AiStatus,
} from '@/lib/insights';

/**
 * Dashboard "AI insights" section.
 *
 * Reads GET /insights/summary via lib/insights (AI is read-only advisory).
 * - Skeletons while loading.
 * - Hides itself entirely when AI is unavailable, errored, or returns nothing,
 *   so it never breaks the dashboard when the backend key is unset.
 */

/** Sparkles mark — inline SVG so it inherits currentColor (no icon dep). */
function SparklesIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5c.35 0 .66.22.78.55l1.32 3.63a3 3 0 0 0 1.79 1.79l3.63 1.32a.83.83 0 0 1 0 1.56l-3.63 1.32a3 3 0 0 0-1.79 1.79l-1.32 3.63a.83.83 0 0 1-1.56 0l-1.32-3.63a3 3 0 0 0-1.79-1.79l-3.63-1.32a.83.83 0 0 1 0-1.56l3.63-1.32a3 3 0 0 0 1.79-1.79l1.32-3.63A.83.83 0 0 1 12 2.5Z" />
      <path d="M19 3.5c.2 0 .38.13.45.32l.5 1.36c.1.28.32.5.6.6l1.36.5a.48.48 0 0 1 0 .9l-1.36.5a1 1 0 0 0-.6.6l-.5 1.36a.48.48 0 0 1-.9 0l-.5-1.36a1 1 0 0 0-.6-.6l-1.36-.5a.48.48 0 0 1 0-.9l1.36-.5a1 1 0 0 0 .6-.6l.5-1.36A.48.48 0 0 1 19 3.5Z" opacity=".7" />
    </svg>
  );
}

/** Per-tone visual treatment: icon chip, accent bar and metric colour. */
const toneStyles: Record<
  InsightTone,
  { icon: string; chip: string; accent: string; metric: string }
> = {
  positive: {
    icon: 'bx-trending-up',
    chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    accent: 'bg-emerald-500',
    metric: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    icon: 'bx-error',
    chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    accent: 'bg-amber-500',
    metric: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: 'bx-info-circle',
    chip: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    accent: 'bg-gray-300 dark:bg-gray-600',
    metric: 'text-gray-900 dark:text-gray-100',
  },
};

function InsightCard({ insight }: { insight: InsightItem }) {
  const tone: InsightTone = insight.tone ?? 'info';
  const styles = toneStyles[tone] ?? toneStyles.info;

  return (
    <div className="relative flex h-full gap-3 overflow-hidden rounded-2xl bg-white p-4 shadow-card ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:ring-gray-800">
      {/* Tone accent bar */}
      <span className={`absolute inset-y-0 left-0 w-1 ${styles.accent}`} aria-hidden="true" />
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.chip}`}
        aria-hidden="true"
      >
        <i className={`bx ${styles.icon} text-lg`}></i>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{insight.title}</h4>
          {insight.metric && (
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${styles.metric}`}>
              {insight.metric}
            </span>
          )}
        </div>
        {insight.body && (
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {insight.body}
          </p>
        )}
      </div>
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:ring-gray-800">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export default function AiInsights() {
  const [status, setStatus] = useState<AiStatus | 'loading'>('loading');
  const [insights, setInsights] = useState<InsightItem[]>([]);

  useEffect(() => {
    let active = true;
    let attempts = 0;
    const load = async () => {
      attempts += 1;
      const result = await fetchInsightsSummary().catch(() => ({
        status: 'error' as AiStatus,
        insights: [] as InsightItem[],
      }));
      if (!active) return;
      setInsights(result.insights);
      setStatus(result.status);
      // Retry transient errors (e.g. a request fired before auth/tenant was
      // ready on first mount) so the dashboard shows insights whenever the
      // chat would — up to 3 tries. 'ok' and 'unavailable' are terminal.
      if (result.status === 'error' && attempts < 3) {
        setTimeout(() => {
          if (active) load();
        }, 2000);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Hide gracefully: nothing to show when AI is off, errored, or empty.
  if (status !== 'loading' && (status !== 'ok' || insights.length === 0)) {
    return null;
  }

  return (
    <section aria-label="AI insights" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-gradient text-white">
          <SparklesIcon className="h-4 w-4" />
        </span>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">AI insights</h2>
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          Kuza AI
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {status === 'loading'
          ? Array.from({ length: 3 }).map((_, i) => <InsightSkeleton key={i} />)
          : insights.map((insight, i) => (
              // First insight spans 2/3, second 1/3 (they fill the top row on lg).
              <div key={`${insight.title}-${i}`} className={i === 0 ? 'lg:col-span-2' : ''}>
                <InsightCard insight={insight} />
              </div>
            ))}
      </div>
    </section>
  );
}
