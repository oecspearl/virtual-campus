// Single-provider LLM service for the Personalised Course Builder.
//
// Uses the Anthropic SDK directly. Structured output is via tool_use:
// we expose a single tool whose input_schema mirrors our Zod schema, and
// `tool_choice: { type: 'tool', name: ... }` forces Claude to call it.
// Anthropic enforces the schema at decode time, so we get a parsed object
// back (no JSON parsing of free-form text). Newer Claude models (Sonnet
// 4.6, Opus 4.7, Haiku 4.5) don't support assistant-message prefill, which
// is why this path uses tool_use rather than the older `{` prefill trick.
//
// We still run the parsed object through Zod for defence-in-depth — the
// JSON Schema we hand Anthropic is generated from the Zod schema via
// `z.toJSONSchema()`, but downstream code reasons over Zod-typed values.
//
// Tests inject `callModel` to exercise the parse / validate / abort paths
// without making real network calls (./__tests__/llm-service.test.ts).

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
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

// Tool name Claude will be forced to call. The model sees this name + the
// description below + the input_schema; that's the entire structured-output
// contract from Anthropic's perspective.
const TOOL_NAME = 'submit_course_assembly';
const TOOL_DESCRIPTION =
  'Submit the assembled personalised course. The input must conform to the schema exactly — every required field present, no extra fields. This is the ONLY way to deliver your output.';

// Convert the Zod schema to JSON Schema once at module load. Anthropic accepts
// standard draft JSON Schema in tool input_schema; defaults / descriptions
// pass through as hints. Computed at module load so we don't pay the
// conversion cost per request.
const COURSE_ASSEMBLY_INPUT_SCHEMA = z.toJSONSchema(courseAssemblySchema) as
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any;

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
      tools: [
        {
          name: TOOL_NAME,
          description: TOOL_DESCRIPTION,
          input_schema: COURSE_ASSEMBLY_INPUT_SCHEMA,
        },
      ],
      // Force Claude to invoke our tool — no plain-text response possible.
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [{ role: 'user', content: buildUserMessage(req) }],
    },
    { signal: ctx.signal },
  );

  const toolUseBlock = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  );
  if (!toolUseBlock) {
    // tool_choice forces tool_use, but if max_tokens was hit before the
    // tool call completed, or the model refused for some reason, we land
    // here. stop_reason on the message tells us which.
    throw new Error(
      `Anthropic did not produce a tool_use response (stop_reason=${message.stop_reason ?? 'unknown'}).`,
    );
  }
  // Anthropic returns the tool input pre-parsed; we re-stringify only to
  // keep the RawModelOutput contract (rawJson is a string the service then
  // re-parses). The double-trip is cheap and keeps the test seam simple.
  return {
    rawJson: JSON.stringify(toolUseBlock.input),
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
