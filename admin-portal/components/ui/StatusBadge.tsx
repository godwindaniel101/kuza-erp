import { statusTokens, type StatusVariant } from '@/lib/designTokens';

export type StatusBadgeVariant = StatusVariant;
export type StatusBadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  /** Label text. If omitted, the variant name (capitalized) is shown. */
  label?: string;
  size?: StatusBadgeSize;
  /** Override the default boxicons icon for the variant. */
  icon?: string;
  className?: string;
}

const sizeClasses: Record<StatusBadgeSize, { wrap: string; icon: string }> = {
  sm: { wrap: 'px-2 py-0.5 text-xs gap-1', icon: 'text-xs' },
  md: { wrap: 'px-2.5 py-1 text-xs gap-1.5', icon: 'text-sm' },
  lg: { wrap: 'px-3 py-1.5 text-sm gap-2', icon: 'text-base' },
};

/**
 * Status badge that pairs color WITH an icon (never color alone) for a11y.
 */
export default function StatusBadge({
  variant,
  label,
  size = 'md',
  icon,
  className = '',
}: StatusBadgeProps) {
  const token = statusTokens[variant];
  const sizes = sizeClasses[size];
  const text = label ?? variant.charAt(0).toUpperCase() + variant.slice(1);

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap font-medium leading-none rounded-full ${sizes.wrap} ${token.bg} ${token.text} ${className}`}
    >
      <i className={`bx ${icon ?? token.icon} ${sizes.icon} shrink-0`} aria-hidden="true"></i>
      <span>{text}</span>
    </span>
  );
}
