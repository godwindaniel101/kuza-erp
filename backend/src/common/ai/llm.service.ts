import { Injectable, Logger } from '@nestjs/common';

/** A single turn in the conversation. */
export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmChatParams {
  /** Optional system prompt (provider-mapped: native for Anthropic, first message for OpenAI-compatible). */
  system?: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface LlmChatResult {
  /** Assistant text; empty string when unavailable. */
  text: string;
  /** false when the provider is not configured, unreachable, or errored. */
  available: boolean;
}

/** Providers the abstraction can dispatch to. Add new ids here and to `handlers`. */
type ProviderId = 'ollama' | 'openai' | 'anthropic';

/**
 * Provider-agnostic LLM gateway. The provider is chosen entirely by env
 * (AI_PROVIDER) so the LLM backend is switched by config, not code:
 *
 *   - 'ollama' (default): a LOCAL OpenAI-compatible /chat/completions endpoint
 *     (Docker Model Runner, Ollama, llama.cpp, vLLM, LM Studio). No API key.
 *       AI_PROVIDER=ollama
 *       OLLAMA_BASE_URL=http://model-runner.docker.internal/engines/v1
 *       OLLAMA_MODEL=ai/llama3.2:latest
 *       OLLAMA_TIMEOUT=30000
 *   - 'openai' : OpenAI (or any OpenAI-compatible) — OPENAI_API_KEY,
 *     OPENAI_MODEL (default gpt-4o-mini), OPENAI_BASE_URL.
 *   - 'anthropic' : Claude — ANTHROPIC_API_KEY, ANTHROPIC_MODEL (default
 *     claude-sonnet-5).
 *
 * chat() NEVER throws: any misconfiguration, timeout, transport error, or
 * unparseable response degrades to { text: '', available: false } so callers
 * can render a graceful "not configured / unavailable" state.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  private static readonly DEFAULT_TIMEOUT_MS = 30_000;
  private static readonly DEFAULT_MAX_TOKENS = 1024;

  /** Provider dispatch table — extend this map to add more providers. */
  private readonly handlers: Record<
    ProviderId,
    (params: LlmChatParams) => Promise<LlmChatResult>
  > = {
    ollama: (params) => this.callOllama(params),
    openai: (params) => this.callOpenAi(params),
    anthropic: (params) => this.callAnthropic(params),
  };

  async chat(params: LlmChatParams): Promise<LlmChatResult> {
    const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
    const handler = this.handlers[provider as ProviderId];
    if (!handler) {
      this.logger.warn(`Unknown AI_PROVIDER "${provider}" — AI unavailable`);
      return { text: '', available: false };
    }
    try {
      return await handler(params);
    } catch (error: any) {
      this.logger.warn(`LLM chat failed (${provider}): ${error?.message}`);
      return { text: '', available: false };
    }
  }

  /** Local model via an OpenAI-compatible /chat/completions endpoint. */
  private async callOllama(params: LlmChatParams): Promise<LlmChatResult> {
    const baseUrl =
      process.env.OLLAMA_BASE_URL ||
      process.env.OLLAMA_BASE_URI ||
      process.env.AI_BASE_URL ||
      'http://model-runner.docker.internal/engines/v1';
    const model = process.env.OLLAMA_MODEL || process.env.AI_MODEL || 'ai/llama3.2:latest';
    const timeoutMs = Number(process.env.OLLAMA_TIMEOUT) || LlmService.DEFAULT_TIMEOUT_MS;
    // Local runtimes ignore the key; send a harmless default so headers are valid.
    return this.chatCompletions(baseUrl, model, 'ollama', params, timeoutMs);
  }

  /** OpenAI (or any OpenAI-compatible provider) — requires an API key. */
  private async callOpenAi(params: LlmChatParams): Promise<LlmChatResult> {
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
      this.logger.warn('AI_PROVIDER=openai but OPENAI_API_KEY is not set');
      return { text: '', available: false };
    }
    const baseUrl = process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4o-mini';
    return this.chatCompletions(baseUrl, model, apiKey, params, LlmService.DEFAULT_TIMEOUT_MS);
  }

  /** Anthropic Messages API (or any api.anthropic.com-compatible endpoint). */
  private async callAnthropic(params: LlmChatParams): Promise<LlmChatResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
      return { text: '', available: false };
    }
    const baseUrl = (process.env.ANTHROPIC_BASE_URL || process.env.AI_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
    const model = process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || 'claude-sonnet-5';

    const body: Record<string, any> = {
      model,
      max_tokens: params.maxTokens ?? LlmService.DEFAULT_MAX_TOKENS,
      messages: params.messages,
    };
    if (params.system) body.system = params.system;
    if (params.temperature !== undefined) body.temperature = params.temperature;

    const data = await this.postJson(
      `${baseUrl}/v1/messages`,
      { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body,
      LlmService.DEFAULT_TIMEOUT_MS,
    );
    if (data === null) return { text: '', available: false };
    if (data?.stop_reason === 'refusal') return { text: '', available: true };

    const text = Array.isArray(data?.content)
      ? data.content
          .filter((block: any) => block?.type === 'text')
          .map((block: any) => block?.text ?? '')
          .join('')
          .trim()
      : '';
    return { text, available: true };
  }

  /**
   * Shared OpenAI-compatible Chat Completions call. `baseUrl` is the API root
   * (e.g. http://model-runner.docker.internal/engines/v1); we POST to
   * {baseUrl}/chat/completions and read choices[0].message.content, falling
   * back to native Ollama shapes (message.content / response).
   */
  private async chatCompletions(
    baseUrl: string,
    model: string,
    apiKey: string,
    params: LlmChatParams,
    timeoutMs: number,
  ): Promise<LlmChatResult> {
    const root = baseUrl.replace(/\/+$/, '');
    const messages: Array<{ role: string; content: string }> = [];
    if (params.system) messages.push({ role: 'system', content: params.system });
    messages.push(...params.messages);

    const body: Record<string, any> = {
      model,
      max_tokens: params.maxTokens ?? LlmService.DEFAULT_MAX_TOKENS,
      messages,
      stream: false,
    };
    if (params.temperature !== undefined) body.temperature = params.temperature;

    const data = await this.postJson(
      `${root}/chat/completions`,
      { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body,
      timeoutMs,
    );
    if (data === null) return { text: '', available: false };

    const content =
      data?.choices?.[0]?.message?.content ?? data?.message?.content ?? data?.response;
    const text = typeof content === 'string' ? content.trim() : '';
    return { text, available: true };
  }

  /**
   * Shared POST with a timeout and defensive parsing. Returns the parsed JSON
   * body, or null on any non-2xx / transport / parse failure (logged).
   */
  private async postJson(
    url: string,
    headers: Record<string, string>,
    body: Record<string, any>,
    timeoutMs: number,
  ): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        this.logger.warn(`LLM endpoint ${url} returned ${response.status}`);
        return null;
      }
      return await response.json();
    } catch (error: any) {
      this.logger.warn(`LLM request to ${url} failed: ${error?.message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
