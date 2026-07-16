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
type ProviderId = 'anthropic' | 'openai';

/**
 * Provider-agnostic LLM gateway. The provider is chosen entirely by env
 * (AI_PROVIDER) so the LLM backend can be switched by config, not code:
 *
 *   - 'anthropic' (default): api.anthropic.com-compatible /v1/messages.
 *   - 'openai': OpenAI-compatible /v1/chat/completions — this is how
 *     Llama-on-Docker is reached (Ollama, llama.cpp, vLLM, LM Studio all
 *     expose this shape).
 *
 * chat() NEVER throws: any misconfiguration, timeout, transport error, or
 * unparseable response degrades to { text: '', available: false } so callers
 * can render a graceful "not configured / unavailable" state.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  private static readonly TIMEOUT_MS = 20_000;
  private static readonly DEFAULT_MAX_TOKENS = 1024;

  /** Provider dispatch table — extend this map to add more providers. */
  private readonly handlers: Record<
    ProviderId,
    (params: LlmChatParams) => Promise<LlmChatResult>
  > = {
    anthropic: (params) => this.callAnthropic(params),
    openai: (params) => this.callOpenAiCompatible(params),
  };

  async chat(params: LlmChatParams): Promise<LlmChatResult> {
    const provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
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

  /** Anthropic Messages API (or any api.anthropic.com-compatible endpoint). */
  private async callAnthropic(params: LlmChatParams): Promise<LlmChatResult> {
    const apiKey = process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Matches prior behaviour: no key -> not configured.
      return { text: '', available: false };
    }

    const baseUrl = (process.env.AI_BASE_URL || 'https://api.anthropic.com').replace(
      /\/+$/,
      '',
    );
    const model = process.env.AI_MODEL || 'claude-sonnet-5';

    const body: Record<string, any> = {
      model,
      max_tokens: params.maxTokens ?? LlmService.DEFAULT_MAX_TOKENS,
      messages: params.messages,
    };
    if (params.system) body.system = params.system;
    if (params.temperature !== undefined) body.temperature = params.temperature;

    const data = await this.postJson(`${baseUrl}/v1/messages`, {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }, body);
    if (data === null) return { text: '', available: false };

    if (data?.stop_reason === 'refusal') {
      // Model refused: this is a real, "available" response with empty text so
      // the caller can decide how to phrase it.
      return { text: '', available: true };
    }

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
   * OpenAI-compatible Chat Completions. AI_BASE_URL should include the API
   * root, e.g. http://ollama:11434/v1 — we POST to {AI_BASE_URL}/chat/completions.
   */
  private async callOpenAiCompatible(
    params: LlmChatParams,
  ): Promise<LlmChatResult> {
    const baseUrl = process.env.AI_BASE_URL;
    if (!baseUrl) {
      this.logger.warn('AI_PROVIDER=openai but AI_BASE_URL is not set');
      return { text: '', available: false };
    }
    const root = baseUrl.replace(/\/+$/, '');
    const model = process.env.AI_MODEL;
    if (!model) {
      this.logger.warn('AI_PROVIDER=openai but AI_MODEL is not set');
      return { text: '', available: false };
    }
    // Many local servers ignore the key entirely; send a harmless default.
    const apiKey = process.env.AI_API_KEY || 'ollama';

    const messages: Array<{ role: string; content: string }> = [];
    if (params.system) messages.push({ role: 'system', content: params.system });
    messages.push(...params.messages);

    const body: Record<string, any> = {
      model,
      max_tokens: params.maxTokens ?? LlmService.DEFAULT_MAX_TOKENS,
      messages,
    };
    if (params.temperature !== undefined) body.temperature = params.temperature;

    const data = await this.postJson(`${root}/chat/completions`, {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    }, body);
    if (data === null) return { text: '', available: false };

    const content = data?.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content.trim() : '';
    return { text, available: true };
  }

  /**
   * Shared POST with a 20s timeout and defensive parsing. Returns the parsed
   * JSON body, or null on any non-2xx / transport / parse failure (logged).
   */
  private async postJson(
    url: string,
    headers: Record<string, string>,
    body: Record<string, any>,
  ): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      LlmService.TIMEOUT_MS,
    );
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
