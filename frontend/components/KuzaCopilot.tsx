import { useEffect, useRef, useState, useCallback, Fragment } from 'react';
import { askCopilot, type CopilotChart, type CopilotTable } from '@/lib/insights';
import { useKuzaStore } from '@/store/kuzaStore';
import { useAuthStore } from '@/store/authStore';
import {
  RevenueAreaChart,
  WeeklyBarChart,
  type AreaPoint,
} from '@/components/ui/charts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Assistant-only: soft error / unavailable rendering. */
  variant?: 'normal' | 'notice';
  /** Assistant-only: optional chart with real, backend-computed points. */
  chart?: CopilotChart;
  /** Assistant-only: optional presentable table with real, backend-computed rows. */
  table?: CopilotTable;
  /** Epoch ms when the message was created (for the timestamp). */
  ts?: number;
}

/** Short "3:45 PM" timestamp; client-only (chat isn't server-rendered). */
function formatTs(ts?: number): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Render a copilot table inline under an answer — a clean, presentable grid. */
function CopilotTableBlock({ table }: { table: CopilotTable }) {
  return (
    <div className="mt-2 w-full max-w-full overflow-x-auto rounded-2xl bg-gray-50 p-3 ring-1 ring-inset ring-gray-100 dark:bg-gray-800/60 dark:ring-gray-800">
      <p className="mb-1.5 px-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
        {table.title}
      </p>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {table.columns.map((c, i) => (
              <th
                key={i}
                className={`border-b border-gray-200 px-2 py-1.5 font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300 ${
                  i === 0 ? 'text-left' : 'text-right'
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="odd:bg-white/50 dark:odd:bg-gray-900/30">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={`border-b border-gray-100 px-2 py-1.5 dark:border-gray-800 ${
                    c === 0
                      ? 'text-left font-medium text-gray-900 dark:text-gray-100'
                      : 'text-right tabular-nums text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {typeof cell === 'number' ? cell.toLocaleString() : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Render a copilot chart inline under an answer, mapping the backend chart
 * type onto the shared chart components: area/line -> RevenueAreaChart,
 * bar -> WeeklyBarChart. Points arrive as {label, value} — the AreaPoint /
 * SimpleBarPoint shape — so they pass straight through.
 */
function CopilotChartBlock({ chart }: { chart: CopilotChart }) {
  const points: AreaPoint[] = chart.points.map((p) => ({
    label: p.label,
    value: p.value,
  }));
  return (
    <div className="mt-2 max-w-[92%] rounded-2xl bg-gray-50 px-3 pb-2 pt-3 ring-1 ring-inset ring-gray-100 dark:bg-gray-800/60 dark:ring-gray-800">
      <p className="mb-1.5 px-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
        {chart.title}
      </p>
      {chart.type === 'bar' ? (
        <WeeklyBarChart data={points} />
      ) : (
        <RevenueAreaChart data={points} height={150} />
      )}
    </div>
  );
}

const SUGGESTIONS = [
  'Am I profitable this month?',
  'Who owes me?',
  "What's low on stock?",
];

/** Sparkles mark — inline SVG so it inherits currentColor (no icon dep). */
function SparklesIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.5c.35 0 .66.22.78.55l1.32 3.63a3 3 0 0 0 1.79 1.79l3.63 1.32a.83.83 0 0 1 0 1.56l-3.63 1.32a3 3 0 0 0-1.79 1.79l-1.32 3.63a.83.83 0 0 1-1.56 0l-1.32-3.63a3 3 0 0 0-1.79-1.79l-3.63-1.32a.83.83 0 0 1 0-1.56l3.63-1.32a3 3 0 0 0 1.79-1.79l1.32-3.63A.83.83 0 0 1 12 2.5Z" />
      <path d="M19 3.5c.2 0 .38.13.45.32l.5 1.36c.1.28.32.5.6.6l1.36.5a.48.48 0 0 1 0 .9l-1.36.5a1 1 0 0 0-.6.6l-.5 1.36a.48.48 0 0 1-.9 0l-.5-1.36a1 1 0 0 0-.6-.6l-1.36-.5a.48.48 0 0 1 0-.9l1.36-.5a1 1 0 0 0 .6-.6l.5-1.36A.48.48 0 0 1 19 3.5Z" opacity=".7" />
    </svg>
  );
}

/**
 * Very light markdown-ish rendering: preserves line breaks and renders
 * **bold** spans. Intentionally minimal — no HTML is injected.
 */
function renderRichText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, li) => (
    <Fragment key={li}>
      {renderBold(line)}
      {li < lines.length - 1 && <br />}
    </Fragment>
  ));
}

function renderBold(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default function KuzaCopilot() {
  const { open, setOpen } = useKuzaStore();
  const userId = useAuthStore((s) => s.user?.id) ?? 'anon';
  const storageKey = `kuza-chat-${userId}`;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const persistReady = useRef(false);

  // Restore this user's chat after mount (client-only, so no SSR mismatch).
  // Blocks the next persist so the initial empty state can't clobber the save.
  useEffect(() => {
    persistReady.current = false;
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) : null;
      setMessages(Array.isArray(saved) ? saved : []);
    } catch {
      setMessages([]);
    }
  }, [storageKey]);

  // Persist on change (keep the last 40 turns). Skips the first run per key so
  // the restore above lands before we write.
  useEffect(() => {
    if (!persistReady.current) {
      persistReady.current = true;
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [messages, storageKey]);

  // Focus the input when the panel opens; restore focus to launcher on close.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Keep the conversation pinned to the latest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      const result = await askCopilot(trimmed);

      const assistantMsg: ChatMessage =
        result.status === 'ok'
          ? {
              id: `a-${Date.now()}`,
              role: 'assistant',
              content: result.answer ?? '',
              variant: 'normal',
              chart: result.chart,
              table: result.table,
              ts: Date.now(),
            }
          : {
              id: `a-${Date.now()}`,
              role: 'assistant',
              content:
                result.message ??
                'Kuza AI is unavailable right now. Please try again later.',
              variant: 'notice',
              ts: Date.now(),
            };

      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
    },
    [loading],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <>
      {/* The launcher lives in the top header (AppHeader) — a "Kuza AI" tag that
          calls useKuzaStore().setOpen(true). This component renders only the
          panel + backdrop. */}

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-gray-950/40 backdrop-blur-sm motion-safe:transition-opacity motion-safe:duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Slide-over panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Kuza AI"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out dark:bg-gray-900 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
              <SparklesIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Kuza AI
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ask about your business
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                aria-label="Clear chat"
                title="Clear chat"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <i className="bx bx-trash text-lg" aria-hidden="true"></i>
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Kuza AI"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <i className="bx bx-x text-xl" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center px-2 py-8 text-center">
              <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <SparklesIcon className="h-6 w-6" />
              </span>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                How can I help?
              </p>
              <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
                Ask a plain-language question about your sales, cash, customers,
                or stock.
              </p>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex flex-col items-end">
                <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-brand-gradient px-3.5 py-2 text-[13px] leading-relaxed text-white">
                  {m.content}
                </div>
                {m.ts && (
                  <span className="mt-0.5 px-1 text-[10px] text-gray-400 dark:text-gray-500">{formatTs(m.ts)}</span>
                )}
              </div>
            ) : (
              <div key={m.id} className="flex flex-col items-start">
                <div
                  className={`max-w-[85%] break-words rounded-2xl rounded-bl-sm px-3.5 py-2 text-[13px] leading-relaxed ${
                    m.variant === 'notice'
                      ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {renderRichText(m.content)}
                </div>
                {m.chart && <CopilotChartBlock chart={m.chart} />}
                {m.table && <CopilotTableBlock table={m.table} />}
                {m.ts && (
                  <span className="mt-0.5 px-1 text-[10px] text-gray-400 dark:text-gray-500">{formatTs(m.ts)}</span>
                )}
              </div>
            ),
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2.5 dark:bg-gray-800">
                <span className="sr-only">Kuza AI is thinking</span>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-gray-400 motion-safe:animate-bounce dark:bg-gray-500"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Suggested prompts (only before the first message) */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                disabled={loading}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-gray-100 p-3 dark:border-gray-800"
        >
          <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 dark:border-gray-700 dark:bg-gray-800">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Kuza AI…"
              className="max-h-32 min-h-[24px] !max-w-none flex-1 resize-none self-center bg-transparent py-1 text-[13px] leading-6 text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white hover:bg-brand-gradient-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40"
            >
              <i className="bx bx-send text-base" aria-hidden="true"></i>
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-gray-400 dark:text-gray-500">
            Kuza AI is advisory and read-only. Double-check important numbers.
          </p>
        </form>
      </aside>
    </>
  );
}
