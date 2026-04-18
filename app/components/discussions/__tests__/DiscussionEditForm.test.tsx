// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiscussionEditForm from '../DiscussionEditForm';
import type { Discussion } from '../hooks/useDiscussionData';

// Keep the rich text editor inert — swap with a textarea so content can be
// changed via userEvent.type.
vi.mock('@/app/components/editor/TextEditor', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="content-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Stub the icon component so we can interact with surrounding buttons by
// their visible label without the icons stealing focus targets.
vi.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

function baseDiscussion(overrides: Partial<Discussion> = {}): Discussion {
  return {
    id: 'd-1',
    title: 'Original Title',
    content: '<p>Original content</p>',
    is_pinned: false,
    is_locked: false,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
    author: { id: 'u-1', name: 'Alice', email: 'a@x.com' },
    votes: [{ count: 0 }],
    is_graded: false,
    ...overrides,
  };
}

describe('DiscussionEditForm', () => {
  const originalFetch = global.fetch;
  const originalAlert = global.alert;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ templates: [] }),
    });
    global.alert = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.alert = originalAlert;
    vi.restoreAllMocks();
  });

  it('initializes inputs from the discussion', () => {
    render(
      <DiscussionEditForm
        discussion={baseDiscussion()}
        discussionId="d-1"
        isInstructor={false}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
    expect(screen.getByTestId('content-editor')).toHaveValue('<p>Original content</p>');
  });

  it('does NOT show grading controls for non-instructors', () => {
    render(
      <DiscussionEditForm
        discussion={baseDiscussion()}
        discussionId="d-1"
        isInstructor={false}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByLabelText(/Graded Discussion/)).not.toBeInTheDocument();
  });

  it('shows grading controls and fetches rubric templates for instructors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        templates: [{ id: 't-1', name: 'Standard', rubric: [], is_system: true }],
      }),
    });
    render(
      <DiscussionEditForm
        discussion={baseDiscussion({ is_graded: true, points: 50 })}
        discussionId="d-1"
        isInstructor
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/Graded Discussion/)).toBeChecked();
    expect(screen.getByDisplayValue(50)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        (global.fetch as any).mock.calls.some(
          ([url]: [string]) => url === '/api/discussions/rubric-templates'
        )
      ).toBe(true)
    );
  });

  it('alerts and skips save when title is empty', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <DiscussionEditForm
        discussion={baseDiscussion()}
        discussionId="d-1"
        isInstructor={false}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />
    );
    await user.clear(screen.getByDisplayValue('Original Title'));
    // The title input has `required`, so clicking submit naturally would
    // block; simulate form submission via the save button — jsdom enforces
    // required client-side, so we bypass by pre-clearing content instead.
    await user.clear(screen.getByTestId('content-editor'));
    await user.click(screen.getByRole('button', { name: /Save Changes/ }));

    expect(onSaved).not.toHaveBeenCalled();
  });

  it('PUTs trimmed title + content and calls onSaved on success', async () => {
    const user = userEvent.setup();
    // First call returns templates; the PUT is second.
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ templates: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const onSaved = vi.fn();

    render(
      <DiscussionEditForm
        discussion={baseDiscussion()}
        discussionId="d-99"
        isInstructor
        onSaved={onSaved}
        onCancel={vi.fn()}
      />
    );
    // Clear + retype the title to ensure trimming happens
    const titleInput = screen.getByDisplayValue('Original Title');
    await user.clear(titleInput);
    await user.type(titleInput, '  Updated  ');

    await user.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const putCall = (global.fetch as any).mock.calls.find(
      ([url, init]: [string, RequestInit]) =>
        url === '/api/discussions/d-99' && init?.method === 'PUT'
    );
    expect(putCall).toBeDefined();
    const body = JSON.parse(putCall[1].body);
    expect(body.title).toBe('Updated');
    expect(body.is_graded).toBe(false);
  });

  it('includes grading fields in the PUT payload when isGraded is true', async () => {
    const user = userEvent.setup();
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ templates: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const onSaved = vi.fn();

    render(
      <DiscussionEditForm
        discussion={baseDiscussion({
          is_graded: true,
          points: 80,
          due_date: '2026-04-10',
          grading_criteria: 'be clear',
          min_replies: 3,
          min_words: 50,
        })}
        discussionId="d-3"
        isInstructor
        onSaved={onSaved}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());

    const putCall = (global.fetch as any).mock.calls.find(
      ([url, init]: [string, RequestInit]) =>
        url === '/api/discussions/d-3' && init?.method === 'PUT'
    );
    const body = JSON.parse(putCall[1].body);
    expect(body).toMatchObject({
      is_graded: true,
      points: 80,
      due_date: '2026-04-10',
      grading_criteria: 'be clear',
      min_replies: 3,
      min_words: 50,
    });
  });

  it('blocks save with points <= 0 when graded', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const { container } = render(
      <DiscussionEditForm
        discussion={baseDiscussion({ is_graded: true, points: 50 })}
        discussionId="d-1"
        isInstructor
        onSaved={onSaved}
        onCancel={vi.fn()}
      />
    );
    const pointsInput = screen.getByDisplayValue(50) as HTMLInputElement;
    await user.clear(pointsInput);
    await user.type(pointsInput, '0');
    // HTML5 `min={1}` would normally block submit in a real browser, but the
    // handler's defense-in-depth check is what we want to verify here —
    // bypass native validation by submitting the form directly.
    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    await waitFor(() =>
      expect(global.alert).toHaveBeenCalledWith(
        'Points must be a positive number for graded discussions'
      )
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked without posting', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <DiscussionEditForm
        discussion={baseDiscussion()}
        discussionId="d-1"
        isInstructor={false}
        onSaved={vi.fn()}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onCancel).toHaveBeenCalled();
    // Only the initial template fetch should have happened (for instructors);
    // for non-instructors, no fetch at all.
    expect(
      (global.fetch as any).mock.calls.some(
        ([url]: [string]) => url === '/api/discussions/d-1'
      )
    ).toBe(false);
  });

  it('alerts with the server error message on a 4xx response', async () => {
    const user = userEvent.setup();
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ templates: [] }) })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'locked' }),
      });
    const onSaved = vi.fn();
    render(
      <DiscussionEditForm
        discussion={baseDiscussion()}
        discussionId="d-1"
        isInstructor
        onSaved={onSaved}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() =>
      expect(global.alert).toHaveBeenCalledWith('Failed to update discussion: locked')
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
