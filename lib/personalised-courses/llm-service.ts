// Provider-agnostic LLM service for the Personalised Course Builder.
//
// Routes through Vercel AI Gateway using plain "provider/model" strings.
// Implements the primary → fallback ladder described in udl.md §4.2:
//
//   * Primary gets one attempt with a strict timeout (default 30s).
//   * On any failure — timeout, network error, malformed/refused response,
//     rate limit — we fall through to the secondary provider.
//   * Secondary gets one attempt with a longer timeout (default 45s).
//   * No retry of the primary after fallback. Retrying both compounds
//     latency without improving reliability.
//   * Both fail → throw LLMUnavailableError; the route handler turns this
//     into a 503 with a "saved as draft, try again" message.
//
// Structured output is enforced by AI SDK's generateObject — the Zod schema
// in ./schema.ts becomes a json_schema (OpenAI) or a forced tool-use input
// schema (Anthropic), and a malformed response throws inside generateObject
// before we ever see it.
//
// Tests (./__tests__/llm-service.test.ts) inject a stub `callModel` so the
// fallback ladder, timeout, and provider-attribution logic can be exercised
// without making real network calls.

import { generateObject } from 'ai';
import {
  type CourseAssemblyRequest,
  type CourseAssemblyResponse,
  LLMUnavailableError,
} from './types';
import { courseAssemblySchema } from './schema';
import { SYSTEM_PROMPT, buildUserMessage, PROMPT_VERSION } from './prompt';

// ── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_PRIMARY_MODEL = 'openai/gpt-4o';
const DEFAULT_FALLBACK_MODEL = 'anthropic/claude-sonnet-4-6';
const DEFAULT_PRIMARY_TIMEOUT_MS = 30_000;
const DEFAULT_FALLBACK_TIMEOUT_MS = 45_000;
const DEFAULT_TEMPERATURE = 0.3;

// ── Types ───────────────────────────────────────────────────────────────────

export type Provider = 'openai' | 'anthropic';

export interface ModelCallResult {
  response: CourseAssemblyResponse;
  promptTokens?: number;
  completionTokens?: number;
}

/**
 * Abstraction over the actual LLM call. Tests stub this; production uses
 * `defaultCallModel` which goes through AI SDK's generateObject().
 */
export type ModelCaller = (
  modelId: string,
  req: CourseAssemblyRequest,
  signal: AbortSignal,
) => Promise<ModelCallResult>;

export interface AssembleCourseResult {
  response: CourseAssemblyResponse;
  provider: Provider;
  model: string;
  promptVersion: string;
  fallbackUsed: boolean;
  /** Set when fallbackUsed=true: the primary's failure reason. */
  primaryError?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface LLMServiceOptions {
  primaryModel?: string;
  fallbackModel?: string;
  primaryTimeoutMs?: number;
  fallbackTimeoutMs?: number;
  /** Override for testing. Production callers should leave this unset. */
  callModel?: ModelCaller;
}

// ── Default model caller (production path) ──────────────────────────────────

export const defaultCallModel: ModelCaller = async (modelId, req, signal) => {
  const result = await generateObject({
    model: modelId,
    schema: courseAssemblySchema,
    system: SYSTEM_PROMPT,
    prompt: buildUserMessage(req),
    abortSignal: signal,
    temperature: envNumber('LLM_TEMPERATURE') ?? DEFAULT_TEMPERATURE,
  });
  // AI SDK v6 surfaces token usage on result.usage. Field names vary slightly
  // by version; treat both as optional and fall back to undefined.
  const usage = (result as { usage?: { inputTokens?: number; outputTokens?: number; promptTokens?: number; completionTokens?: number } }).usage;
  return {
    response: result.object as CourseAssemblyResponse,
    promptTokens: usage?.inputTokens ?? usage?.promptTokens,
    completionTokens: usage?.outputTokens ?? usage?.completionTokens,
  };
};

// ── Service ─────────────────────────────────────────────────────────────────

export class LLMService {
  private readonly primaryModel: string;
  private readonly fallbackModel: string;
  private readonly primaryTimeoutMs: number;
  private readonly fallbackTimeoutMs: number;
  private readonly callModel: ModelCaller;

  constructor(opts: LLMServiceOptions = {}) {
    this.primaryModel =
      opts.primaryModel ?? process.env.LLM_PRIMARY_MODEL ?? DEFAULT_PRIMARY_MODEL;
    this.fallbackModel =
      opts.fallbackModel ?? process.env.LLM_FALLBACK_MODEL ?? DEFAULT_FALLBACK_MODEL;
    this.primaryTimeoutMs =
      opts.primaryTimeoutMs ??
      envNumber('LLM_PRIMARY_TIMEOUT_MS') ??
      DEFAULT_PRIMARY_TIMEOUT_MS;
    this.fallbackTimeoutMs =
      opts.fallbackTimeoutMs ??
      envNumber('LLM_FALLBACK_TIMEOUT_MS') ??
      DEFAULT_FALLBACK_TIMEOUT_MS;
    this.callModel = opts.callModel ?? defaultCallModel;
  }

  async assembleCourse(req: CourseAssemblyRequest): Promise<AssembleCourseResult> {
    let primaryError: Error | undefined;

    try {
      const result = await this.callWithTimeout(
        this.primaryModel,
        req,
        this.primaryTimeoutMs,
      );
      return {
        response: result.response,
        provider: providerOf(this.primaryModel),
        model: this.primaryModel,
        promptVersion: PROMPT_VERSION,
        fallbackUsed: false,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      };
    } catch (err) {
      primaryError = err instanceof Error ? err : new Error(String(err));
    }

    try {
      const result = await this.callWithTimeout(
        this.fallbackModel,
        req,
        this.fallbackTimeoutMs,
      );
      return {
        response: result.response,
        provider: providerOf(this.fallbackModel),
        model: this.fallbackModel,
        promptVersion: PROMPT_VERSION,
        fallbackUsed: true,
        primaryError: primaryError.message,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      };
    } catch (fallbackError) {
      const fb =
        fallbackError instanceof Error
          ? fallbackError
          : new Error(String(fallbackError));
      throw new LLMUnavailableError(
        `Both LLM providers failed. Primary (${this.primaryModel}): ${primaryError.message}. Fallback (${this.fallbackModel}): ${fb.message}`,
        { cause: fb },
      );
    }
  }

  private async callWithTimeout(
    modelId: string,
    req: CourseAssemblyRequest,
    timeoutMs: number,
  ): Promise<ModelCallResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(
        new Error(`LLM request to ${modelId} timed out after ${timeoutMs}ms`),
      );
    }, timeoutMs);
    try {
      return await this.callModel(modelId, req, controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the provider name from a Gateway-style "provider/model" id.
 * Throws on malformed ids and on unsupported providers, since logging a
 * provider we can't recognise downstream would silently corrupt audit rows.
 */
export function providerOf(modelId: string): Provider {
  const slash = modelId.indexOf('/');
  if (slash === -1) {
    throw new Error(
      `Model id "${modelId}" must be in "provider/model" form (e.g. "openai/gpt-4o").`,
    );
  }
  const p = modelId.slice(0, slash);
  if (p !== 'openai' && p !== 'anthropic') {
    throw new Error(
      `Unsupported LLM provider "${p}". Only "openai" and "anthropic" are wired into the audit log.`,
    );
  }
  return p;
}

function envNumber(key: string): number | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
