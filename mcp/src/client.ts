/**
 * Thin, read-only HTTP client for the Kuza backend REST API.
 *
 * Auth (per-tenant isolation preserved):
 *   - Every request carries a Kuza JWT. A Kuza JWT is tenant-scoped — it carries
 *     the tenantId and the backend's TenantTransactionInterceptor pins the
 *     Postgres search_path to that tenant's schema for every request. So every
 *     call this client makes is automatically confined to the token owner's
 *     tenant; there is no way to reach another tenant's data with it.
 *   - Token resolution, in order of preference:
 *       1. KUZA_API_TOKEN — a stable, revocable per-user token issued from
 *          Settings → API. On first use it is exchanged (POST
 *          /auth/api-token/exchange) for a short-lived JWT, which is cached.
 *          When the cached JWT expires (a call 401s), it is transparently
 *          re-exchanged. This is the recommended, long-running setup: revoke the
 *          token in the UI to cut off access, no password needed.
 *       2. KUZA_TOKEN — a pasted JWT. Used as-is; cannot be refreshed, so a
 *          long session may need a restart when it lapses.
 *       3. KUZA_EMAIL / KUZA_PASSWORD — log in once and cache the returned JWT
 *          (re-login transparently on 401).
 */

const DEFAULT_TIMEOUT_MS = 40_000;

export interface KuzaClientConfig {
  /** Backend origin, e.g. http://localhost:3000 (the API root is <baseUrl>/api). */
  baseUrl: string;
  /** Stable, revocable per-user API token (kuza_…) — exchanged for a JWT. */
  apiToken?: string;
  /** A pre-issued Kuza JWT (optional if apiToken or email+password are given). */
  token?: string;
  email?: string;
  password?: string;
}

export class KuzaError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'KuzaError';
  }
}

export class KuzaClient {
  private readonly apiRoot: string;
  private token?: string;

  constructor(private readonly cfg: KuzaClientConfig) {
    this.apiRoot = cfg.baseUrl.replace(/\/+$/, '') + '/api';
    // NB: do NOT pre-seed this.token from cfg.token here — ensureToken() applies
    // the API-token-first precedence, and a stale KUZA_TOKEN must not shadow it.
  }

  /** Whether we can transparently mint a fresh JWT (used to retry once on 401). */
  private canRefresh(): boolean {
    return Boolean(
      this.cfg.apiToken || (this.cfg.email && this.cfg.password),
    );
  }

  /** Resolve (and cache) a bearer JWT, per the precedence documented above. */
  private async ensureToken(): Promise<string> {
    if (this.token) return this.token;

    // 1) API token → exchange for a short-lived JWT (preferred: revocable).
    if (this.cfg.apiToken) {
      const data = await this.request(
        'POST',
        '/auth/api-token/exchange',
        { body: { token: this.cfg.apiToken }, auth: false },
      );
      const token = data?.token;
      if (typeof token !== 'string') {
        throw new KuzaError('API token exchange returned no JWT.');
      }
      this.token = token;
      return token;
    }

    // 2) Pasted JWT (used as-is; cannot be refreshed).
    if (this.cfg.token) {
      this.token = this.cfg.token;
      return this.token;
    }

    // 3) email/password login.
    if (this.cfg.email && this.cfg.password) {
      const data = await this.request('POST', '/auth/login', {
        body: { email: this.cfg.email, password: this.cfg.password },
        auth: false,
      });
      const token = data?.token;
      if (typeof token !== 'string') {
        throw new KuzaError('Login succeeded but no token was returned.');
      }
      this.token = token;
      return token;
    }

    throw new KuzaError(
      'No credentials: set KUZA_API_TOKEN, or KUZA_TOKEN, or KUZA_EMAIL and KUZA_PASSWORD.',
    );
  }

  /**
   * Perform a request against the API, unwrapping the { success, data } envelope
   * and surfacing a clean error on non-2xx. `auth: false` skips the bearer
   * header (used for the login / token-exchange calls). On a 401 with a
   * refreshable credential (API token or email+password) the cached JWT is
   * dropped and the call retried ONCE with a freshly minted JWT.
   */
  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    opts: { body?: unknown; auth?: boolean } = {},
    allowRetry = true,
  ): Promise<any> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (opts.auth !== false) headers.authorization = `Bearer ${await this.ensureToken()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.apiRoot}${path}`, {
        method,
        headers,
        signal: controller.signal,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
      const text = await res.text();
      const json = text ? safeJson(text) : null;
      if (!res.ok) {
        // JWT expired/invalid → drop it and re-mint once (only if we can).
        if (
          res.status === 401 &&
          allowRetry &&
          opts.auth !== false &&
          this.canRefresh()
        ) {
          this.token = undefined;
          return this.request(method, path, opts, false);
        }
        const msg =
          (json && (json.message || json.error)) || `HTTP ${res.status} for ${path}`;
        throw new KuzaError(
          typeof msg === 'string' ? msg : JSON.stringify(msg),
          res.status,
        );
      }
      // Kuza wraps successful responses as { success, data, message }.
      return json && typeof json === 'object' && 'data' in json ? json.data : json;
    } catch (err: any) {
      if (err instanceof KuzaError) throw err;
      throw new KuzaError(err?.message || 'Request failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  // --- Read-only API surface used by the MCP tools -------------------------

  /** Kuza Copilot Q&A (POST /insights/copilot), optionally scoped to a branch. */
  askCopilot(question: string, branchId?: string): Promise<any> {
    return this.request('POST', '/insights/copilot', {
      body: branchId ? { question, branchId } : { question },
    });
  }

  /** Plain-language business digest (GET /insights/digest). */
  getDigest(): Promise<any> {
    return this.request('GET', '/insights/digest');
  }

  /** Branch list (GET /settings/branches). */
  getBranches(): Promise<any> {
    return this.request('GET', '/settings/branches');
  }
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
