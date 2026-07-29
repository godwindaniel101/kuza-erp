import StatusBadge, { type StatusBadgeSize } from './StatusBadge';

export type StockLevel = 'low' | 'optimal' | 'overstock';

interface StockStatusBadgeProps {
  currentStock: number;
  minimumStock?: number;
  maximumStock?: number;
  size?: StatusBadgeSize;
  /** Override labels (e.g. for i18n). */
  labels?: Partial<Record<StockLevel, string>>;
}

export function getStockLevel(
  currentStock: number,
  minimumStock?: number,
  maximumStock?: number,
): StockLevel {
  const current = Number(currentStock || 0);
  const min = Number(minimumStock || 0);
  const max = Number(maximumStock || 0);
  if (current <= min) return 'low';
  if (max > 0 && current >= max) return 'overstock';
  return 'optimal';
}

const levelToVariant = {
  low: 'error',
  optimal: 'success',
  overstock: 'warning',
} as const;

const defaultLabels: Record<StockLevel, string> = {
  low: 'Low stock',
  optimal: 'In stock',
  overstock: 'Overstock',
};

export default function StockStatusBadge({
  currentStock,
  minimumStock,
  maximumStock,
  size = 'md',
  labels,
}: StockStatusBadgeProps) {
  const level = getStockLevel(currentStock, minimumStock, maximumStock);
  return (
    <StatusBadge
      variant={levelToVariant[level]}
      label={labels?.[level] ?? defaultLabels[level]}
      size={size}
    />
  );
}
