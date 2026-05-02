import { describe, it, expect, vi } from 'vitest';
import {
  LLMService,
  providerOf,
  type ModelCaller,
  type ModelCallResult,
} from '../llm-service';
import {
  type CourseAssemblyRequest,
  type CourseAssemblyResponse,
  LLMUnavailableError,
} from '../types';
import { PROMPT_VERSION } from '../prompt';

// ── Fixtures ────────────────────────────────────────────────────────────────

const sampleRequest: CourseAssemblyRequest = {
  learnerGoal: 'Build a recommendation system at work.',
  selectedLessons: [],
  availableLessons: [],
  conceptTaxonomy: ['recommendation-systems'],
};

const sampleResponse: CourseAssemblyResponse = {
  generatedSequence: [],
  recommendedAdditions: [],
  flaggedGaps: [],
  flaggedConflicts: [],
  generatedSyllabus: '# Path',
  inferredObjectives: [],
};

function ok(response: CourseAssemblyResponse = sampleResponse): ModelCallResult {
  return { response, promptTokens: 100, completionTokens: 50 };
}

// Build a caller whose nth invocation returns the corresponding entry from
// `outcomes`. `outcomes[i]` is either a ModelCallResult (resolves) or an
// Error (rejects). Records every (modelId) it was called with on `calls`.
function makeCaller(
  outcomes: Array<ModelCallResult | Error | (() => Promise<ModelCallResult>)>,
  calls: string[] = [],
): { call: ModelCaller; calls: string[] } {
  let i = 0;
  const call: ModelCaller = async (modelId, _req, _signal) => {
    calls.push(modelId);
    const outcome = outcomes[i++];
    if (outcome === undefined) throw new Error(`Unexpected extra call to ${modelId}`);
    if (outcome instanceof Error) throw outcome;
    if (typeof outcome === 'function') return outcome();
    return outcome;
  };
  return { call, calls };
}

// ── providerOf ──────────────────────────────────────────────────────────────

describe('providerOf', () => {
  it('extracts openai from "openai/gpt-4o"', () => {
    expect(providerOf('openai/gpt-4o')).toBe('openai');
  });

  it('extracts anthropic from "anthropic/claude-sonnet-4-6"', () => {
    expect(providerOf('anthropic/claude-sonnet-4-6')).toBe('anthropic');
  });

  it('throws on a model id without a slash', () => {
    expect(() => providerOf('gpt-4o')).toThrow(/provider\/model/);
  });

  it('throws on an unsupported provider', () => {
    // We deliberately reject providers we haven't wired into the audit log,
    // because logging an unknown provider name would silently corrupt the
    // personalised_course_requests.llm_provider column downstream.
    expect(() => providerOf('cohere/command')).toThrow(/Unsupported/);
  });
});

// ── LLMService.assembleCourse — happy paths ────────────────────────────────

describe('LLMService.assembleCourse — primary success', () => {
  it('returns the primary response without invoking fallback', async () => {
    const calls: string[] = [];
    const { call } = makeCaller([ok()], calls);

    const svc = new LLMService({
      primaryModel: 'openai/gpt-4o',
      fallbackModel: 'anthropic/claude-sonnet-4-6',
      callModel: call,
    });

    const result = await svc.assembleCourse(sampleRequest);

    expect(calls).toEqual(['openai/gpt-4o']);
    expect(result.fallbackUsed).toBe(false);
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('openai/gpt-4o');
    expect(result.promptVersion).toBe(PROMPT_VERSION);
    expect(result.primaryError).toBeUndefined();
    expect(result.response).toEqual(sampleResponse);
    expect(result.promptTokens).toBe(100);
    expect(result.completionTokens).toBe(50);
  });
});

// ── LLMService.assembleCourse — fallback paths ─────────────────────────────

describe('LLMService.assembleCourse — fallback', () => {
  it('falls through to the fallback when primary fails, records primaryError', async () => {
    const calls: string[] = [];
    const { call } = makeCaller(
      [new Error('primary kaboom'), ok()],
      calls,
    );

    const svc = new LLMService({
      primaryModel: 'openai/gpt-4o',
      fallbackModel: 'anthropic/claude-sonnet-4-6',
      callModel: call,
    });

    const result = await svc.assembleCourse(sampleRequest);

    expect(calls).toEqual(['openai/gpt-4o', 'anthropic/claude-sonnet-4-6']);
    expect(result.fallbackUsed).toBe(true);
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('anthropic/claude-sonnet-4-6');
    expect(result.primaryError).toBe('primary kaboom');
  });

  it('does NOT retry the primary after falling back', async () => {
    // Spec rule: "Do not retry the primary after falling back. Retrying both
    // providers compounds latency and costs without improving reliability."
    const calls: string[] = [];
    const { call } = makeCaller(
      [new Error('primary kaboom'), ok()],
      calls,
    );

    const svc = new LLMService({
      primaryModel: 'openai/gpt-4o',
      fallbackModel: 'anthropic/claude-sonnet-4-6',
      callModel: call,
    });

    await svc.assembleCourse(sampleRequest);

    expect(calls).toHaveLength(2);
    expect(calls.filter((m) => m === 'openai/gpt-4o')).toHaveLength(1);
  });

  it('treats malformed/refused responses (callModel throwing) the same as network errors', async () => {
    // generateObject() in production throws on malformed JSON or schema-mismatch;
    // the service treats that as "primary failed", same as a transport error.
    const calls: string[] = [];
    const { call } = makeCaller(
      [new Error('Schema validation failed: expected array, got string'), ok()],
      calls,
    );

    const svc = new LLMService({
      primaryModel: 'openai/gpt-4o',
      fallbackModel: 'anthropic/claude-sonnet-4-6',
      callModel: call,
    });

    const result = await svc.assembleCourse(sampleRequest);
    expect(result.fallbackUsed).toBe(true);
    expect(result.primaryError).toMatch(/Schema validation failed/);
  });
});

// ── LLMService.assembleCourse — both fail ──────────────────────────────────

describe('LLMService.assembleCourse — both providers fail', () => {
  it('throws LLMUnavailableError mentioning both providers', async () => {
    // A stateless caller that always fails per-model — lets us assert on
    // the same error multiple times without re-arming the queue.
    const call: ModelCaller = async (modelId) => {
      if (modelId === 'openai/gpt-4o') throw new Error('primary down');
      if (modelId === 'anthropic/claude-sonnet-4-6') throw new Error('fallback down');
      throw new Error(`unexpected model ${modelId}`);
    };

    const svc = new LLMService({
      primaryModel: 'openai/gpt-4o',
      fallbackModel: 'anthropic/claude-sonnet-4-6',
      callModel: call,
    });

    let caught: unknown;
    try {
      await svc.assembleCourse(sampleRequest);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(LLMUnavailableError);
    const msg = (caught as Error).message;
    expect(msg).toContain('openai/gpt-4o');
    expect(msg).toContain('primary down');
    expect(msg).toContain('anthropic/claude-sonnet-4-6');
    expect(msg).toContain('fallback down');
  });
});

// ── LLMService.assembleCourse — timeout ────────────────────────────────────

describe('LLMService.assembleCourse — timeouts', () => {
  it('aborts the primary after primaryTimeoutMs and falls through', async () => {
    vi.useFakeTimers();
    try {
      // Primary: caller waits on the abort signal, throws when signal fires.
      // Fallback: returns immediately.
      const calls: string[] = [];
      let primaryAborted = false;

      const call: ModelCaller = async (modelId, _req, signal) => {
        calls.push(modelId);
        if (modelId === 'openai/gpt-4o') {
          await new Promise<void>((_, reject) => {
            signal.addEventListener('abort', () => {
              primaryAborted = true;
              reject(signal.reason ?? new Error('aborted'));
            });
          });
          throw new Error('unreachable');
        }
        return ok();
      };

      const svc = new LLMService({
        primaryModel: 'openai/gpt-4o',
        fallbackModel: 'anthropic/claude-sonnet-4-6',
        primaryTimeoutMs: 1_000,
        fallbackTimeoutMs: 5_000,
        callModel: call,
      });

      const promise = svc.assembleCourse(sampleRequest);

      // Advance past the primary timeout — primary should abort and fallback runs.
      await vi.advanceTimersByTimeAsync(1_500);
      const result = await promise;

      expect(primaryAborted).toBe(true);
      expect(calls).toEqual(['openai/gpt-4o', 'anthropic/claude-sonnet-4-6']);
      expect(result.fallbackUsed).toBe(true);
      expect(result.primaryError).toMatch(/timed out/);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── Provider attribution ───────────────────────────────────────────────────

describe('LLMService.assembleCourse — provider attribution', () => {
  it('rejects an invalid model id at construction-time use, not silently', async () => {
    // Constructor accepts the string; the failure surfaces when we try to
    // attribute the provider after a successful call. This is by design —
    // we can't validate model availability without making a call, but we
    // must validate provider parsing before writing audit rows.
    const { call } = makeCaller([ok()]);

    const svc = new LLMService({
      primaryModel: 'invalid-no-slash',
      fallbackModel: 'anthropic/claude-sonnet-4-6',
      callModel: call,
    });

    await expect(svc.assembleCourse(sampleRequest)).rejects.toThrow(
      /provider\/model/,
    );
  });
});
