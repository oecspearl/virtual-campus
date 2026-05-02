import { describe, it, expect, vi } from 'vitest';
import {
  LLMService,
  type ModelCaller,
  type RawModelOutput,
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

// A response that satisfies the Zod schema. All required fields populated.
// courseDescription must be at least 200 chars (per schema), so the fixture
// is long enough on purpose — kept generic so it won't drift if we tweak
// the prompt.
const validResponse: CourseAssemblyResponse = {
  courseTitle: 'A focused learning path',
  courseDescription:
    'This personalised path situates the learner within a broader topic, ' +
    'surveying what the assembled lessons cover at a higher level and ' +
    'motivating why this particular sequence serves their stated goal. ' +
    'It is intended as a starting point — concrete enough to ship, ' +
    'generic enough to remain stable across prompt revisions in tests.',
  generatedSequence: [],
  recommendedAdditions: [],
  flaggedGaps: [],
  flaggedConflicts: [],
  generatedSyllabus: '# A path',
  inferredObjectives: [],
};

function rawOk(response: CourseAssemblyResponse = validResponse): RawModelOutput {
  return {
    rawJson: JSON.stringify(response),
    promptTokens: 100,
    completionTokens: 50,
  };
}

// ── Happy path ──────────────────────────────────────────────────────────────

describe('LLMService.assembleCourse — happy path', () => {
  it('parses the JSON response and returns a typed result', async () => {
    const call: ModelCaller = async () => rawOk();
    const svc = new LLMService({ model: 'gpt-4o', callModel: call });
    const result = await svc.assembleCourse(sampleRequest);

    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o');
    expect(result.promptVersion).toBe(PROMPT_VERSION);
    expect(result.response).toEqual(validResponse);
    expect(result.promptTokens).toBe(100);
    expect(result.completionTokens).toBe(50);
  });

  it('reads model from OPENAI_MODEL env var when not passed', async () => {
    const previous = process.env.OPENAI_MODEL;
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    try {
      const svc = new LLMService({ callModel: async () => rawOk() });
      const result = await svc.assembleCourse(sampleRequest);
      expect(result.model).toBe('gpt-4o-mini');
    } finally {
      if (previous === undefined) delete process.env.OPENAI_MODEL;
      else process.env.OPENAI_MODEL = previous;
    }
  });
});

// ── Error paths ─────────────────────────────────────────────────────────────

describe('LLMService.assembleCourse — error paths', () => {
  it('wraps a network/API failure in LLMUnavailableError', async () => {
    const call: ModelCaller = async () => {
      throw new Error('socket hang up');
    };
    const svc = new LLMService({ model: 'gpt-4o', callModel: call });
    await expect(svc.assembleCourse(sampleRequest)).rejects.toBeInstanceOf(
      LLMUnavailableError,
    );
    await expect(svc.assembleCourse(sampleRequest)).rejects.toThrow(/socket hang up/);
  });

  it('throws LLMUnavailableError on non-JSON content', async () => {
    const call: ModelCaller = async () => ({
      rawJson: 'not json at all',
      promptTokens: 10,
      completionTokens: 5,
    });
    const svc = new LLMService({ callModel: call });
    await expect(svc.assembleCourse(sampleRequest)).rejects.toThrow(/non-JSON/);
  });

  it('throws LLMUnavailableError on schema mismatch', async () => {
    // Valid JSON, missing required fields.
    const call: ModelCaller = async () => ({
      rawJson: JSON.stringify({ generatedSequence: [], inferredObjectives: [] }),
      promptTokens: 10,
      completionTokens: 5,
    });
    const svc = new LLMService({ callModel: call });
    await expect(svc.assembleCourse(sampleRequest)).rejects.toThrow(
      /did not match the expected schema/,
    );
  });
});

// ── Timeout ─────────────────────────────────────────────────────────────────

describe('LLMService.assembleCourse — timeout', () => {
  it('aborts the in-flight call when timeoutMs elapses', async () => {
    vi.useFakeTimers();
    try {
      let aborted = false;
      const call: ModelCaller = async (_req, ctx) => {
        await new Promise<void>((_, reject) => {
          ctx.signal.addEventListener('abort', () => {
            aborted = true;
            reject(ctx.signal.reason ?? new Error('aborted'));
          });
        });
        throw new Error('unreachable');
      };
      const svc = new LLMService({ model: 'gpt-4o', timeoutMs: 1_000, callModel: call });
      const promise = svc.assembleCourse(sampleRequest);
      // Surface the rejection so vitest doesn't flag an unhandled rejection
      // when the abort fires below.
      promise.catch(() => {});
      await vi.advanceTimersByTimeAsync(1_500);
      await expect(promise).rejects.toThrow(/timed out/);
      expect(aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
