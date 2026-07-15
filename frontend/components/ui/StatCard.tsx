import { ReactNode } from 'react';
import { Sparkline } from './charts';

export type StatCardTone = 'default' | 'success' | 'warning' | 'error' | 'info' | 'red' | 'blue';

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Boxicons name, e.g. "bx-box". */
  icon?: string;
  tone?: StatCardTone;
  /** Optional small caption below the value. */
  caption?: string;
  /** Optional trend e.g. "+12%". */
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  /** Optional mini series rendered as a sparkline under the value. */
  spark?: number[];
  loading?: boolean;
  className?: string;
}

const toneClasses: Record<StatCardTone, { halo: string; icon: string }> = {
  default: { halo: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-500 dark:text-gray-400' },
  success: { halo: 'bg-emerald-50 dark:bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400' },
  warning: { halo: 'bg-amber-50 dark:bg-amber-500/10', icon: 'text-amber-600 dark:text-amber-400' },
  error: { halo: 'bg-red-50 dark:bg-red-500/10', icon: 'text-red-600 dark:text-red-400' },
  info: { halo: 'bg-sky-50 dark:bg-sky-500/10', icon: 'text-sky-600 dark:text-sky-400' },
  // Legacy tones — resolve to brand so old call sites unify.
  red: { halo: 'bg-brand-50 dark:bg-brand-500/10', icon: 'text-brand-600 dark:text-brand-400' },
  blue: { halo: 'bg-brand-50 dark:bg-brand-500/10', icon: 'text-brand-600 dark:text-brand-400' },
};

export default function StatCard({
  label,
  value,
  icon,
  tone = 'default',
  caption,
  trend,
  spark,
  loading = false,
  className = '',
}: StatCardProps) {
  const tones = toneClasses[tone];
  const trendClasses =
    trend?.direction === 'up'
      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20 dark:ring-emerald-400/20'
      : trend?.direction === 'down'
      ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-red-600/20 dark:ring-red-400/20'
      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 ring-gray-500/20';
  const trendIcon =
    trend?.direction === 'up' ? 'bx-up-arrow-alt' : trend?.direction === 'down' ? 'bx-down-arrow-alt' : 'bx-minus';

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-20 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ) : (
            <div className="mt-1.5 flex items-baseline gap-2">
              <p className="text-[23px] leading-7 font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
              {trend && (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${trendClasses}`}
                >
                  <i className={`bx ${trendIcon}`} aria-hidden="true"></i>
                  {trend.value}
                </span>
              )}
            </div>
          )}
          {caption && !loading && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{caption}</p>
          )}
          {spark && spark.length > 1 && !loading && (
            <div className="mt-2">
              <Sparkline data={spark} />
            </div>
          )}
        </div>
        {icon && (
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tones.halo}`}>
            <i className={`bx ${icon} text-xl ${tones.icon}`} aria-hidden="true"></i>
          </div>
        )}
      </div>
    </div>
  );
}
