// Single-provider LLM service for the Personalised Course Builder.
//
// Uses the Anthropic SDK directly. Structured output is via assistant-message
// prefill (we seed `{` so Claude continues with JSON), and we validate the
// parsed response against the Zod schema in ./schema.ts — any parse failure
// or schema mismatch surfaces as LLMUnavailableError, which the route handler
// turns into a 503 with a "saved as draft, try again" message and a stub
// draft so the learner doesn't lose their selection.
//
// Tests inject `callModel` to exercise the parse / validate / abort paths
// without making real network calls (./__tests__/llm-service.test.ts).

import Anthropic from '@anthropic-ai/sdk';
import {
  type CourseAssemblyRequest,
  type CourseAssemblyResponse,
  LLMUnavailableError,
} from './types';
import { courseAssemblySchema } from './schema';
import { SYSTEM_PROMPT, buildUserMessage, PROMPT_VERSION } from './prompt';

// ── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 8_192;

// Prefill the assistant turn with `{` so Claude continues with JSON. We
// reattach the leading `{` to the response before parsing.
const JSON_PREFILL = '{';

// ── Types ───────────────────────────────────────────────────────────────────

export type Provider = 'anthropic';

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
 * uses `defaultCallModel` which goes through the Anthropic SDK.
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.');
  }
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create(
    {
      model: ctx.model,
      max_tokens: envNumber('LLM_MAX_TOKENS') ?? DEFAULT_MAX_TOKENS,
      temperature: envNumber('LLM_TEMPERATURE') ?? DEFAULT_TEMPERATURE,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildUserMessage(req) },
        // Prefill the assistant turn with `{` to force JSON-only output.
        // Claude will continue from this opening brace and not emit any
        // prose preamble. We reattach the brace below before parsing.
        { role: 'assistant', content: JSON_PREFILL },
      ],
    },
    { signal: ctx.signal },
  );

  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock || !textBlock.text) {
    throw new Error('Anthropic returned an empty response.');
  }
  return {
    rawJson: JSON_PREFILL + textBlock.text,
    promptTokens: message.usage?.input_tokens,
    completionTokens: message.usage?.output_tokens,
  };
};

// ── Service ─────────────────────────────────────────────────────────────────

export class LLMService {
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly callModel: ModelCaller;

  constructor(opts: LLMServiceOptions = {}) {
    this.model = opts.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
    this.timeoutMs =
      opts.timeoutMs ?? envNumber('LLM_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS;
    this.callModel = opts.callModel ?? defaultCallModel;
  }

  async assembleCourse(req: CourseAssemblyRequest): Promise<AssembleCourseResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(
        new Error(`Anthropic request timed out after ${this.timeoutMs}ms`),
      );
    }, this.timeoutMs);

    let raw: RawModelOutput;
    try {
      raw = await this.callModel(req, { model: this.model, signal: controller.signal });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new LLMUnavailableError(
        `Anthropic call failed (${this.model}): ${msg}`,
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
      throw new LLMUnavailableError(`Anthropic returned non-JSON content: ${msg}`);
    }

    const validation = courseAssemblySchema.safeParse(parsed);
    if (!validation.success) {
      // Log a truncated sample of the raw JSON so we can see WHAT the model
      // produced when it fails validation. The route's catch handler logs
      // the wrapped error message; this gives us the missing other half.
      console.error('Personalisation: schema validation failed', {
        model: this.model,
        rawJsonSample:
          raw.rawJson.length > 2000 ? `${raw.rawJson.slice(0, 2000)}…[truncated]` : raw.rawJson,
      });
      throw new LLMUnavailableError(
        `Anthropic response did not match the expected schema: ${validation.error.message}`,
      );
    }

    return {
      response: validation.data as CourseAssemblyResponse,
      provider: 'anthropic',
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
