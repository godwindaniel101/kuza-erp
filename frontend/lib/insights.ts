import { api } from '@/lib/api';

/**
 * Client helpers for the Kuza AI features.
 *
 * Backend contract (built in parallel):
 *   POST /insights/copilot { question } -> { answer }
 *   GET  /insights/summary            -> { insights: [{ title, body, tone?, metric? }] }
 *
 * Responses are parsed defensively: the shared api client unwraps the axios
 * envelope, but the backend may still wrap payloads in { success, data } (the
 * app-wide convention) or return the bare shape. Both are handled. AI is
 * read-only advisory — these helpers never mutate anything.
 */

export type InsightTone = 'positive' | 'warning' | 'info';

export interface InsightItem {
  title: string;
  body: string;
  tone?: InsightTone;
  metric?: string;
}

export type AiStatus = 'ok' | 'unavailable' | 'error';

export type CopilotChartType = 'area' | 'bar' | 'line';

export interface CopilotChartPoint {
  label: string;
  value: number;
}

export interface CopilotChart {
  type: CopilotChartType;
  title: string;
  points: CopilotChartPoint[];
}

/** A presentable data table the backend attached (rows are real, code-computed). */
export interface CopilotTable {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface CopilotResult {
  status: AiStatus;
  answer?: string;
  /** Optional chart the backend attached (points are real, code-computed). */
  chart?: CopilotChart;
  /** Optional table the backend attached (rows are real, code-computed). */
  table?: CopilotTable;
  /** Human-readable message for error/unavailable states. */
  message?: string;
}

export interface SummaryResult {
  status: AiStatus;
  insights: InsightItem[];
  message?: string;
}

const UNAVAILABLE_MESSAGE =
  'Kuza AI is unavailable right now. Please try again later.';

/** Unwrap a possible { success, data } envelope to reach the real payload. */
function unwrap(raw: any): any {
  if (raw && typeof raw === 'object' && 'data' in raw && !('answer' in raw) && !('insights' in raw)) {
    return raw.data ?? raw;
  }
  return raw;
}

/** Detect the backend signalling that AI is turned off (no API key, etc.). */
function looksUnavailable(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.available === false) return true;
  if (payload.aiAvailable === false) return true;
  if (typeof payload.status === 'string' && payload.status.toLowerCase() === 'unavailable') {
    return true;
  }
  return false;
}

/** Map a thrown request error to an AiStatus + message. */
function classifyError(err: any): { status: AiStatus; message: string } {
  const httpStatus = err?.response?.status;
  // 503 (service unavailable) / 501 (not implemented) => feature is off.
  if (httpStatus === 503 || httpStatus === 501) {
    return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
  }
  const serverMsg = err?.response?.data?.message;
  return {
    status: 'error',
    message:
      (typeof serverMsg === 'string' && serverMsg) ||
      'Something went wrong reaching Kuza AI. Please try again.',
  };
}

export async function askCopilot(question: string): Promise<CopilotResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { status: 'error', message: 'Please enter a question.' };
  }

  try {
    // Bounded above the backend LLM timeout (OLLAMA_TIMEOUT, default 30s) so an
    // unreachable model resolves to "unavailable" instead of loading forever.
    const raw = await api.post('/insights/copilot', { question: trimmed }, { timeout: 40000 });
    const payload = unwrap(raw);

    if (looksUnavailable(raw) || looksUnavailable(payload)) {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    }

    const answer =
      typeof payload?.answer === 'string'
        ? payload.answer
        : typeof raw?.answer === 'string'
        ? raw.answer
        : '';

    if (!answer.trim()) {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    }

    const chart = normalizeChart(payload?.chart ?? raw?.chart);
    const table = normalizeTable(payload?.table ?? raw?.table);
    const result: CopilotResult = { status: 'ok', answer };
    if (chart) result.chart = chart;
    if (table) result.table = table;
    return result;
  } catch (err) {
    return classifyError(err);
  }
}

/** Defensively validate a table payload; undefined if malformed. */
function normalizeTable(table: any): CopilotTable | undefined {
  if (!table || typeof table !== 'object') return undefined;
  if (!Array.isArray(table.columns) || !Array.isArray(table.rows)) return undefined;
  const columns = table.columns.map((c: any) => String(c ?? ''));
  if (columns.length === 0) return undefined;
  const rows = table.rows
    .filter((r: any) => Array.isArray(r))
    .map((r: any[]) => r.map((c) => (typeof c === 'number' ? c : String(c ?? ''))));
  if (rows.length === 0) return undefined;
  const title =
    typeof table.title === 'string' && table.title.trim() ? table.title.trim() : 'Breakdown';
  return { title, columns, rows };
}

/**
 * Defensively validate a chart payload from the backend. Returns undefined for
 * anything malformed so the UI simply renders the answer without a chart.
 */
function normalizeChart(chart: any): CopilotChart | undefined {
  if (!chart || typeof chart !== 'object') return undefined;
  const type =
    chart.type === 'area' || chart.type === 'bar' || chart.type === 'line'
      ? chart.type
      : undefined;
  if (!type) return undefined;
  if (!Array.isArray(chart.points)) return undefined;

  const points: CopilotChartPoint[] = chart.points
    .filter(
      (p: any) =>
        p && typeof p === 'object' && Number.isFinite(Number(p.value)),
    )
    .map((p: any) => ({ label: String(p.label ?? ''), value: Number(p.value) }));

  if (points.length === 0) return undefined;

  const title =
    typeof chart.title === 'string' && chart.title.trim()
      ? chart.title.trim()
      : 'Chart';
  return { type, title, points };
}

export async function fetchInsightsSummary(): Promise<SummaryResult> {
  try {
    // Bounded: the digest is data-only (no LLM), so if it hasn't answered in
    // 12s treat it as unavailable rather than spinning the loader forever.
    const raw = await api.get('/insights/summary', { timeout: 12000 });
    const payload = unwrap(raw);

    if (looksUnavailable(raw) || looksUnavailable(payload)) {
      return { status: 'unavailable', insights: [], message: UNAVAILABLE_MESSAGE };
    }

    const list = Array.isArray(payload?.insights)
      ? payload.insights
      : Array.isArray(raw?.insights)
      ? raw.insights
      : Array.isArray(payload)
      ? payload
      : [];

    const insights: InsightItem[] = list
      .filter((it: any) => it && (it.title || it.body))
      .map((it: any) => ({
        title: String(it.title ?? '').trim() || 'Insight',
        body: String(it.body ?? '').trim(),
        tone: normalizeTone(it.tone),
        metric:
          it.metric != null && String(it.metric).trim()
            ? String(it.metric).trim()
            : undefined,
      }));

    return { status: 'ok', insights };
  } catch (err) {
    const { status, message } = classifyError(err);
    return { status, insights: [], message };
  }
}

function normalizeTone(tone: any): InsightTone | undefined {
  if (tone === 'positive' || tone === 'warning' || tone === 'info') return tone;
  // Tolerate a few synonyms the model/backend might emit.
  if (tone === 'success' || tone === 'good') return 'positive';
  if (tone === 'danger' || tone === 'error' || tone === 'alert') return 'warning';
  if (tone === 'neutral') return 'info';
  return undefined;
}
