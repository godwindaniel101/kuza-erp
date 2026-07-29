import { ReactNode } from 'react';

/**
 * DashboardHero — the shared "hero moment" at the top of every vertical
 * dashboard. It dresses for the current service via the accent gradient
 * (`bg-accent-gradient`, driven by `data-app` on the shell) and leads with the
 * display type, then surfaces a strip of headline metrics BEFORE the detailed
 * StatCard grid / charts / tables below.
 *
 * The structural language is identical across every vertical (icon tile +
 * eyebrow + display title + subtitle + on-accent actions, then a metric strip)
 * — only the accent, copy and which metrics differ, so the product reads as one
 * system. Actions rendered on the band should use `heroActionPrimary` /
 * `heroActionGhost` so they stay legible on the coloured surface.
 */

/** Primary page action — accent-gradient button on a normal surface. */
export const heroActionPrimary =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-accent-gradient px-4 text-[13px] font-semibold ' +
  'text-white shadow-sm transition-all hover:bg-accent-gradient-hover active:scale-[0.98] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

/** Secondary / ghost page action — ring button on a normal surface. */
export const heroActionGhost =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold ' +
  'text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 transition-colors ' +
  'hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring disabled:opacity-60 disabled:cursor-not-allowed';

export interface HeroMetric {
  label: string;
  value: ReactNode;
  /** Small caption under the value. */
  hint?: ReactNode;
  /** Optional emphasis element beside the value (e.g. a delta pill). */
  pill?: ReactNode;
}

interface DashboardHeroProps {
  /** Small overline above the title — usually the vertical name, e.g. "Inventory". */
  eyebrow?: string;
  /** Boxicons name shown in the accent tile, e.g. "bx-box". */
  icon?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned actions — style with heroActionPrimary / heroActionGhost. */
  actions?: ReactNode;
  /** Headline metrics rendered as glass tiles on the band. Keep to 2–4. */
  metrics?: HeroMetric[];
  className?: string;
}

const metricCols: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
};

export default function DashboardHero({
  eyebrow,
  icon,
  title,
  subtitle,
  actions,
  metrics,
  className = '',
}: DashboardHeroProps) {
  const cols = metrics ? metricCols[Math.min(metrics.length, 4)] ?? 'sm:grid-cols-4' : '';

  return (
    <section
      className={`relative isolate overflow-hidden rounded-2xl bg-accent-gradient text-white shadow-card ${className}`}
    >
      {/* Soft depth — static, so no reduced-motion concern. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 right-28 h-52 w-52 rounded-full bg-black/10 blur-2xl"
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            {icon && (
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/25 sm:flex">
                <i className={`bx ${icon} text-2xl`} aria-hidden="true"></i>
              </span>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-white/70">{eyebrow}</p>
              )}
              <h1 className="font-display text-[1.6rem] font-semibold leading-tight tracking-tight text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 max-w-2xl text-sm text-white/80">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>

        {metrics && metrics.length > 0 && (
          <div className={`mt-5 grid grid-cols-2 gap-2.5 ${cols}`}>
            {metrics.map((m, i) => (
              <div
                key={`${m.label}-${i}`}
                className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15 backdrop-blur-sm"
              >
                <p className="truncate text-2xs font-semibold uppercase tracking-wider text-white/70">{m.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="font-display text-xl font-semibold tabular-nums leading-6 text-white">{m.value}</p>
                  {m.pill}
                </div>
                {m.hint && <p className="mt-0.5 truncate text-xs text-white/70">{m.hint}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
