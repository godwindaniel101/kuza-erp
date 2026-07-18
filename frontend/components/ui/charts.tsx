/**
 * Hand-rolled inline SVG charts — no chart libraries.
 *
 * Colors (checked for legibility on light #fff / dark #111827 surfaces):
 *   series 1 (revenue/income): #4a77e8 (brand navy-blue 500) — legible both modes
 *   series 2 (expenses):       #d97706 (amber-600)           — passes both modes
 *   positive accent:           #10b981 (mint-emerald)        — passes both modes
 * Area charts get a soft vertical gradient fill from the series color to
 * transparent. Text/grid always wear text tokens (gray), never series colors.
 */
import { useId, useMemo, useRef, useState } from 'react';

export const SERIES_1 = '#2e56d3';
export const SERIES_2 = '#d97706';
export const SERIES_POSITIVE = '#10b981';

const fmtCompact = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : Math.abs(v) >= 1_000
    ? `${(v / 1_000).toFixed(Math.abs(v) >= 10_000 ? 0 : 1)}k`
    : `${Math.round(v)}`;

/* ------------------------------------------------------------------ */
/* Mini sparkline (StatCard)                                          */
/* ------------------------------------------------------------------ */

export function Sparkline({
  data,
  width = 88,
  height = 28,
  stroke = SERIES_1,
  fill = false,
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  /** Render a soft vertical gradient area under the line. */
  fill?: boolean;
}) {
  const gradientId = useId();
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pad = 2;
  const y = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / range);
  const points = data.map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = data[data.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.24" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,${height - pad} ${points} ${width},${height - pad}`}
            fill={`url(#${gradientId})`}
          />
        </>
      )}
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width} cy={y(last)} r="2.5" fill={stroke} className="stroke-white dark:stroke-gray-900" strokeWidth="1.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Area chart (14-day revenue)                                        */
/* ------------------------------------------------------------------ */

export interface AreaPoint {
  label: string; // short x label, e.g. "Jun 28"
  value: number;
}

export function RevenueAreaChart({
  data,
  height = 180,
  formatValue = fmtCompact,
  emptyMessage = 'No revenue recorded yet',
  onPointClick,
}: {
  data: AreaPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  emptyMessage?: string;
  /** When set, clicking the chart drills into the nearest point (pointer cursor). */
  onPointClick?: (index: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId();

  const width = 720; // viewBox width; scales responsively
  const m = { top: 12, right: 12, bottom: 22, left: 40 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  const { max, path, area, xs, ys } = useMemo(() => {
    const values = data.map((d) => d.value);
    const rawMax = Math.max(...values, 0);
    const max = rawMax > 0 ? rawMax * 1.1 : 1;
    const stepX = data.length > 1 ? iw / (data.length - 1) : iw;
    const xs = data.map((_, i) => m.left + i * stepX);
    const ys = data.map((d) => m.top + ih * (1 - d.value / max));
    const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const area = `${path} L${(m.left + iw).toFixed(1)},${m.top + ih} L${m.left},${m.top + ih} Z`;
    return { max, path, area, xs, ys };
  }, [data, ih, iw, m.left, m.top]);

  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-40 items-center justify-center text-[13px] text-gray-400 dark:text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let best = Infinity;
    xs.forEach((x, i) => {
      const d = Math.abs(x - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  };

  const ticks = [0.5, 1].map((f) => max * f);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full"
        role="img"
        aria-label="Revenue, last 14 days"
        style={onPointClick ? { cursor: 'pointer' } : undefined}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onClick={onPointClick ? () => hover != null && onPointClick(hover) : undefined}
      >
        <defs>
          {/* soft vertical gradient: series color -> transparent */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_1} stopOpacity="0.28" />
            <stop offset="100%" stopColor={SERIES_1} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* recessive grid + y labels (text tokens, not series color) */}
        {ticks.map((tv) => {
          const ty = m.top + ih * (1 - tv / max);
          return (
            <g key={tv}>
              <line x1={m.left} x2={m.left + iw} y1={ty} y2={ty} className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="1" />
              <text x={m.left - 6} y={ty + 3} textAnchor="end" className="fill-gray-400 dark:fill-gray-500 text-[10px]">
                {formatValue(tv)}
              </text>
            </g>
          );
        })}
        {/* baseline */}
        <line x1={m.left} x2={m.left + iw} y1={m.top + ih} y2={m.top + ih} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke={SERIES_1} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* x labels: first, middle, last */}
        {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) => (
          <text
            key={i}
            x={xs[i]}
            y={height - 6}
            textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
            className="fill-gray-400 dark:fill-gray-500 text-[10px]"
          >
            {data[i].label}
          </text>
        ))}

        {/* hover crosshair */}
        {hover != null && (
          <g>
            <line x1={xs[hover]} x2={xs[hover]} y1={m.top} y2={m.top + ih} className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={xs[hover]} cy={ys[hover]} r="4" fill={SERIES_1} className="stroke-white dark:stroke-gray-900" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover != null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-md bg-gray-900 dark:bg-gray-700 px-2 py-1 text-2xs text-white shadow-popover whitespace-nowrap"
          style={{ left: `${(xs[hover] / width) * 100}%` }}
        >
          <span className="opacity-70">{data[hover].label}</span>{' '}
          <span className="font-semibold">{formatValue(data[hover].value)}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grouped bars (income vs expenses, last 6 months)                   */
/* ------------------------------------------------------------------ */

export interface GroupedBarPoint {
  label: string; // e.g. "Feb"
  a: number; // income
  b: number; // expenses
}

/* ------------------------------------------------------------------ */
/* Weekly bars (single series, reference "Weekly Revenue" style)      */
/* ------------------------------------------------------------------ */

export interface SimpleBarPoint {
  label: string; // e.g. "Mon"
  value: number;
}

/**
 * Single-series bar chart: soft muted bars with rounded tops; the peak bar
 * is highlighted in the mint-emerald positive accent (never color alone —
 * the tooltip/title carries the value).
 */
export function WeeklyBarChart({
  data,
  height = 160,
  formatValue = fmtCompact,
  emptyMessage = 'No activity yet',
  onBarClick,
}: {
  data: SimpleBarPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  emptyMessage?: string;
  /** When set, bars become clickable (drill-down) and show a pointer cursor. */
  onBarClick?: (index: number) => void;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const width = 360;
  const m = { top: 10, right: 8, bottom: 20, left: 34 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  const max = useMemo(() => {
    const raw = Math.max(...data.map((d) => d.value), 0);
    return raw > 0 ? raw * 1.1 : 1;
  }, [data]);

  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-32 items-center justify-center text-[13px] text-gray-400 dark:text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const groupW = iw / data.length;
  const barW = Math.min(26, groupW * 0.55);
  const barH = (v: number) => Math.max(v > 0 ? 2 : 0, ih * (v / max));
  const ticks = [0.5, 1].map((f) => max * f);
  const r = 5; // rounded top radius

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label="Weekly totals">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor={SERIES_POSITIVE} />
          </linearGradient>
        </defs>
        {ticks.map((tv) => {
          const ty = m.top + ih * (1 - tv / max);
          return (
            <g key={tv}>
              <line x1={m.left} x2={m.left + iw} y1={ty} y2={ty} className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="1" />
              <text x={m.left - 5} y={ty + 3} textAnchor="end" className="fill-gray-400 dark:fill-gray-500 text-[9px]">
                {formatValue(tv)}
              </text>
            </g>
          );
        })}
        <line x1={m.left} x2={m.left + iw} y1={m.top + ih} y2={m.top + ih} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />

        {data.map((d, i) => {
          const x = m.left + groupW * i + (groupW - barW) / 2;
          const h = barH(d.value);
          const y = m.top + ih - h;
          const rr = Math.min(r, h);
          const isPeak = i === peak;
          return (
            <g key={`${d.label}-${i}`}>
              <path
                d={`M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + barW - rr},${y} Q${x + barW},${y} ${x + barW},${y + rr} L${x + barW},${y + h} Z`}
                fill={isPeak ? `url(#${gradientId})` : undefined}
                className={isPeak ? undefined : 'fill-gray-200 dark:fill-gray-700'}
                opacity={hover != null && hover !== i ? 0.55 : 1}
                style={onBarClick ? { cursor: 'pointer' } : undefined}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={onBarClick ? () => onBarClick(i) : undefined}
              >
                <title>{onBarClick ? `${d.label}: ${formatValue(d.value)} — click for details` : `${d.label}: ${formatValue(d.value)}`}</title>
              </path>
              <text x={x + barW / 2} y={height - 5} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500 text-[9px]">
                {d.label.length > 9 ? `${d.label.slice(0, 8)}…` : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function GroupedBarChart({
  data,
  seriesA = 'Income',
  seriesB = 'Expenses',
  height = 200,
  formatValue = fmtCompact,
  emptyMessage = 'No accounting activity yet',
}: {
  data: GroupedBarPoint[];
  seriesA?: string;
  seriesB?: string;
  height?: number;
  formatValue?: (v: number) => string;
  emptyMessage?: string;
}) {
  const [hover, setHover] = useState<{ g: number; s: 'a' | 'b' } | null>(null);

  const width = 720;
  const m = { top: 12, right: 12, bottom: 22, left: 40 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  const max = useMemo(() => {
    const raw = Math.max(...data.flatMap((d) => [d.a, d.b]), 0);
    return raw > 0 ? raw * 1.1 : 1;
  }, [data]);

  if (!data || data.length === 0 || data.every((d) => d.a === 0 && d.b === 0)) {
    return (
      <div className="flex h-40 items-center justify-center text-[13px] text-gray-400 dark:text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const groupW = iw / data.length;
  const barW = Math.min(22, groupW * 0.28);
  const gap = 2; // 2px surface gap between adjacent bars
  const barH = (v: number) => Math.max(v > 0 ? 2 : 0, ih * (v / max));
  const ticks = [0.5, 1].map((f) => max * f);

  return (
    <div>
      {/* legend — identity never color-alone; text wears text tokens */}
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SERIES_1 }} />
          {seriesA}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SERIES_2 }} />
          {seriesB}
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label={`${seriesA} vs ${seriesB} by month`}>
          {ticks.map((tv) => {
            const ty = m.top + ih * (1 - tv / max);
            return (
              <g key={tv}>
                <line x1={m.left} x2={m.left + iw} y1={ty} y2={ty} className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="1" />
                <text x={m.left - 6} y={ty + 3} textAnchor="end" className="fill-gray-400 dark:fill-gray-500 text-[10px]">
                  {formatValue(tv)}
                </text>
              </g>
            );
          })}
          <line x1={m.left} x2={m.left + iw} y1={m.top + ih} y2={m.top + ih} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />

          {data.map((d, i) => {
            const cx = m.left + groupW * i + groupW / 2;
            const bars: Array<{ s: 'a' | 'b'; v: number; x: number; color: string; name: string }> = [
              { s: 'a', v: d.a, x: cx - barW - gap / 2, color: SERIES_1, name: seriesA },
              { s: 'b', v: d.b, x: cx + gap / 2, color: SERIES_2, name: seriesB },
            ];
            return (
              <g key={d.label}>
                {bars.map((bar) => {
                  const h = barH(bar.v);
                  const y = m.top + ih - h;
                  const dimmed = hover && !(hover.g === i && hover.s === bar.s);
                  return (
                    <g key={bar.s}>
                      {/* rounded top, square base anchored to baseline */}
                      <path
                        d={`M${bar.x},${y + h} L${bar.x},${y + 2} Q${bar.x},${y} ${bar.x + 2},${y} L${bar.x + barW - 2},${y} Q${bar.x + barW},${y} ${bar.x + barW},${y + 2} L${bar.x + barW},${y + h} Z`}
                        fill={bar.color}
                        opacity={dimmed ? 0.4 : 1}
                        onMouseEnter={() => setHover({ g: i, s: bar.s })}
                        onMouseLeave={() => setHover(null)}
                      >
                        <title>{`${d.label} · ${bar.name}: ${formatValue(bar.v)}`}</title>
                      </path>
                    </g>
                  );
                })}
                <text x={cx} y={height - 6} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500 text-[10px]">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
