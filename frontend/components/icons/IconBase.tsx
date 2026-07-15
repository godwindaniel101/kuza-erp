import type { ReactNode } from 'react';

/**
 * Kuza icon system — bespoke, cohesive SVG set.
 *
 * Design language:
 *   - 24x24 grid, single artboard, ~2px optical padding.
 *   - 1.75px stroke, round caps + round joins, no fills (currentColor stroke).
 *   - Geometric-but-friendly: consistent corner radii, consistent "person",
 *     "document" and "arrow" primitives across the whole family.
 *   - One colour via currentColor so icons inherit text colour everywhere.
 *
 * Every icon renders through IconBase so stroke width, sizing, caps/joins and
 * accessibility stay identical across the entire set. Individual icons only
 * supply geometry — never stroke/size attributes.
 */
export interface IconProps {
  /** Rendered width & height in px. Default 24 (the design grid). */
  size?: number;
  /** Extra classes (e.g. Tailwind text-* to colour, or sizing overrides). */
  className?: string;
  /** Stroke width on the 24px grid. Default 1.75 — the Kuza standard. */
  strokeWidth?: number;
}

interface IconBaseProps extends IconProps {
  children: ReactNode;
  /** Optional accessible label. When omitted the icon is decorative (aria-hidden). */
  title?: string;
}

export default function IconBase({
  size = 24,
  strokeWidth = 1.75,
  className,
  title,
  children,
}: IconBaseProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable={false}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
