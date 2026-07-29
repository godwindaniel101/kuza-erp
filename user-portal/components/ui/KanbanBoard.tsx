import { ReactNode, useRef, useState } from 'react';
import { statusTokens, type StatusVariant } from '@/lib/designTokens';
import { Skeleton } from './Skeleton';

/**
 * A single Kanban column definition. `id` must match the value returned by
 * the board's `groupBy` for the items that belong here.
 */
export interface KanbanColumn {
  /** Stable column id — matched against `groupBy(item)`. */
  id: string;
  /** Header label. */
  title: ReactNode;
  /**
   * Optional status variant. Drives the small header dot + soft column tint,
   * reusing the shared status palette (color is always paired with a label).
   */
  variant?: StatusVariant;
  /** Boxicons name shown in this column's empty state. Defaults to "bx-inbox". */
  emptyIcon?: string;
  /** Text shown when the column has no cards. */
  emptyLabel?: ReactNode;
  /** Extra Tailwind classes for this column shell. */
  className?: string;
}

interface KanbanBoardProps<T extends { id: string }> {
  /** Column definitions, rendered left-to-right in the order given. */
  columns: KanbanColumn[];
  /** All items across every column. */
  items: T[];
  /** Maps an item to the id of the column it belongs to. */
  groupBy: (item: T) => string;
  /** Renders the body of a single card. The board provides the shell. */
  renderCard: (item: T) => ReactNode;
  /**
   * Called when a card is dropped onto a different column. Not called when the
   * card is dropped back onto its own column. Wire this to your persistence /
   * optimistic-update logic.
   */
  onCardMove?: (itemId: string, fromColumn: string, toColumn: string) => void;
  /** Show a skeleton board instead of real content. */
  loading?: boolean;
  /** Skeleton cards rendered per column while `loading`. Default 3. */
  skeletonCards?: number;
  /** Disable drag-and-drop entirely (read-only board). */
  disableDrag?: boolean;
  /** Override the id used for keys / DnD payloads. Defaults to `item.id`. */
  getItemId?: (item: T) => string;
  /** Custom empty-column renderer. Falls back to the built-in empty state. */
  renderColumnEmpty?: (column: KanbanColumn) => ReactNode;
  className?: string;
}

const dotColor: Record<StatusVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-sky-500',
  pending: 'bg-amber-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
};

/**
 * Generic, drag-and-drop Kanban board built on native HTML5 DnD (no external
 * library). Columns are derived from a status/group field via `groupBy`, cards
 * are rendered by the caller, and moves are surfaced through `onCardMove`.
 *
 * Dark-mode aware and consistent with the Kuza UI kit (cards, tokens, icons).
 *
 * @example
 * <KanbanBoard
 *   columns={[
 *     { id: 'pending', title: 'Pending', variant: 'pending' },
 *     { id: 'completed', title: 'Completed', variant: 'success' },
 *   ]}
 *   items={orders}
 *   groupBy={(o) => o.status}
 *   renderCard={(o) => <div>{o.orderNumber}</div>}
 *   onCardMove={(id, from, to) => updateOrderStatus(id, to)}
 * />
 */
export default function KanbanBoard<T extends { id: string }>({
  columns,
  items,
  groupBy,
  renderCard,
  onCardMove,
  loading = false,
  skeletonCards = 3,
  disableDrag = false,
  getItemId,
  renderColumnEmpty,
  className = '',
}: KanbanBoardProps<T>) {
  // The dragged payload. Kept in a ref because `dataTransfer.getData` is not
  // reliably readable during `dragover` across browsers; state is only used to
  // drive visual affordances (dim source card, highlight target column).
  const dragRef = useRef<{ itemId: string; fromColumn: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const idOf = (item: T) => (getItemId ? getItemId(item) : item.id);

  // Bucket items once per render.
  const buckets = new Map<string, T[]>();
  columns.forEach((c) => buckets.set(c.id, []));
  for (const item of items) {
    const col = groupBy(item);
    if (buckets.has(col)) buckets.get(col)!.push(item);
    // Items whose group has no matching column are intentionally not shown.
  }

  const dndEnabled = !disableDrag && !loading;

  const handleDragStart = (e: React.DragEvent, itemId: string, fromColumn: string) => {
    if (!dndEnabled) return;
    dragRef.current = { itemId, fromColumn };
    setDraggingId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    // Provide a payload for accessibility / native drop targets.
    try {
      e.dataTransfer.setData('text/plain', itemId);
    } catch {
      /* some browsers throw if setData is called with an odd MIME — safe to ignore */
    }
  };

  const handleDragEnd = () => {
    dragRef.current = null;
    setDraggingId(null);
    setOverColumn(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    if (!dndEnabled || !dragRef.current) return;
    // Allow dropping.
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overColumn !== columnId) setOverColumn(columnId);
  };

  const handleColumnDrop = (e: React.DragEvent, toColumn: string) => {
    if (!dndEnabled) return;
    e.preventDefault();
    const payload = dragRef.current;
    handleDragEnd();
    if (!payload) return;
    if (payload.fromColumn === toColumn) return;
    onCardMove?.(payload.itemId, payload.fromColumn, toColumn);
  };

  return (
    <div className={`flex gap-4 overflow-x-auto pb-2 ${className}`}>
      {columns.map((column) => {
        const columnItems = buckets.get(column.id) ?? [];
        const isOver = overColumn === column.id;
        const isEmpty = columnItems.length === 0;

        return (
          <div
            key={column.id}
            className={`flex w-72 shrink-0 flex-col rounded-2xl bg-gray-50 dark:bg-gray-900/60 ring-1 ring-gray-950/[0.04] dark:ring-gray-800 transition-colors duration-150 ${
              isOver ? 'ring-2 ring-brand-400 dark:ring-brand-500 bg-brand-50/50 dark:bg-brand-500/[0.06]' : ''
            } ${column.className ?? ''}`}
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDrop={(e) => handleColumnDrop(e, column.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                {column.variant && (
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${dotColor[column.variant]}`}
                    aria-hidden="true"
                  />
                )}
                <span className="truncate text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {column.title}
                </span>
              </div>
              <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gray-200 px-1.5 text-2xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {loading ? '·' : columnItems.length}
              </span>
            </div>

            {/* Column body */}
            <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
              {loading ? (
                Array.from({ length: skeletonCards }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-white dark:bg-gray-900 p-3 shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800"
                  >
                    <Skeleton className="mb-2 h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : isEmpty ? (
                renderColumnEmpty ? (
                  renderColumnEmpty(column)
                ) : (
                  <div
                    className={`m-1 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center transition-colors duration-150 ${
                      isOver
                        ? 'border-brand-400 dark:border-brand-500 text-brand-600 dark:text-brand-400'
                        : 'border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <i className={`bx ${column.emptyIcon ?? 'bx-inbox'} mb-1 text-xl`} aria-hidden="true" />
                    <span className="text-xs">{column.emptyLabel ?? 'Nothing here'}</span>
                  </div>
                )
              ) : (
                columnItems.map((item) => {
                  const itemId = idOf(item);
                  const isDragging = draggingId === itemId;
                  return (
                    <div
                      key={itemId}
                      draggable={dndEnabled}
                      onDragStart={(e) => handleDragStart(e, itemId, column.id)}
                      onDragEnd={handleDragEnd}
                      className={`rounded-xl bg-white dark:bg-gray-900 shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 transition-all duration-150 hover:shadow-card-hover ${
                        dndEnabled ? 'cursor-grab active:cursor-grabbing' : ''
                      } ${isDragging ? 'opacity-40' : ''}`}
                    >
                      {renderCard(item)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
