// Single-provider LLM service for the Personalised Course Builder.
//
// Uses the OpenAI SDK directly (matching the convention in app/api/ai/**),
// not Vercel AI Gateway. Structured output is via OpenAI's json_object mode
// and we validate the parsed response against the Zod schema in ./schema.ts —
// any parse failure or schema mismatch surfaces as LLMUnavailableError, which
// the route handler turns into a 503 with a "saved as draft, try again"
// message and a stub draft so the learner doesn't lose their selection.
//
// Tests inject `callModel` to exercise the parse / validate / abort paths
// without making real network calls (./__tests__/llm-service.test.ts).

import OpenAI from 'openai';
import {
  type CourseAssemblyRequest,
  type CourseAssemblyResponse,
  LLMUnavailableError,
} from './types';
import { courseAssemblySchema } from './schema';
import { SYSTEM_PROMPT, buildUserMessage, PROMPT_VERSION } from './prompt';

// ── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_TEMPERATURE = 0.3;

// ── Types ───────────────────────────────────────────────────────────────────

export type Provider = 'openai';

export interface AssembleCourseResult {
  response: CourseAssemblyResponse;
  provider: Provider;
  model: string;
  promptVersion: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface ModelCallContext {
  model: string;
  signal: AbortSignal;
}

export interface RawModelOutput {
  rawJson: string;
  promptTokens?: number;
  completionTokens?: number;
}

/**
 * Lowest-level seam: hand a request + model context to "something" that
 * returns a JSON string and token counts. Tests pass a stub here; production
 * uses `defaultCallModel` which goes through the OpenAI SDK.
 */
export type ModelCaller = (
  req: CourseAssemblyRequest,
  ctx: ModelCallContext,
) => Promise<RawModelOutput>;

export interface LLMServiceOptions {
  model?: string;
  timeoutMs?: number;
  /** Override for testing. Production callers should leave this unset. */
  callModel?: ModelCaller;
}

// ── Default model caller (production path) ──────────────────────────────────

const defaultCallModel: ModelCaller = async (req, ctx) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create(
    {
      model: ctx.model,
      temperature: envNumber('LLM_TEMPERATURE') ?? DEFAULT_TEMPERATURE,
      // json_object mode forces the model to return valid JSON. Combined
      // with the Zod parse downstream, this gives us strict-shaped output
      // without needing OpenAI's beta json_schema strict mode.
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(req) },
      ],
    },
    { signal: ctx.signal },
  );

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }
  return {
    rawJson: content,
    promptTokens: completion.usage?.prompt_tokens,
    completionTokens: completion.usage?.completion_tokens,
  };
};

// ── Service ─────────────────────────────────────────────────────────────────

export class LLMService {
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly callModel: ModelCaller;

  constructor(opts: LLMServiceOptions = {}) {
    this.model = opts.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
    this.timeoutMs =
      opts.timeoutMs ?? envNumber('LLM_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS;
    this.callModel = opts.callModel ?? defaultCallModel;
  }

  async assembleCourse(req: CourseAssemblyRequest): Promise<AssembleCourseResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(
        new Error(`OpenAI request timed out after ${this.timeoutMs}ms`),
      );
    }, this.timeoutMs);

    let raw: RawModelOutput;
    try {
      raw = await this.callModel(req, { model: this.model, signal: controller.signal });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new LLMUnavailableError(
        `OpenAI call failed (${this.model}): ${msg}`,
        { cause: err },
      );
    } finally {
      clearTimeout(timer);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.rawJson);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new LLMUnavailableError(`OpenAI returned non-JSON content: ${msg}`);
    }

    const validation = courseAssemblySchema.safeParse(parsed);
    if (!validation.success) {
      throw new LLMUnavailableError(
        `OpenAI response did not match the expected schema: ${validation.error.message}`,
      );
    }

    return {
      response: validation.data as CourseAssemblyResponse,
      provider: 'openai',
      model: this.model,
      promptVersion: PROMPT_VERSION,
      promptTokens: raw.promptTokens,
      completionTokens: raw.completionTokens,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function envNumber(key: string): number | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
