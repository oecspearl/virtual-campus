// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReplyForm from '../ReplyForm';

// TextEditor is a heavy rich-text component — replace with a plain textarea
// so we can `user.type` content into the form.
vi.mock('@/app/components/editor/TextEditor', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="reply-content"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('ReplyForm', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('shows a validation error when submitted empty', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onCancel = vi.fn();
    render(
      <ReplyForm
        discussionId="d-1"
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole('button', { name: /Post Reply/ }));
    expect(await screen.findByText('Content is required')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('POSTs to the replies endpoint and calls onSuccess on 200', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ reply: { id: 'r-1' } }),
    });
    const onSuccess = vi.fn();
    render(
      <ReplyForm
        discussionId="d-1"
        parentReplyId="parent-1"
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />
    );
    await user.type(screen.getByTestId('reply-content'), 'hello');
    await user.click(screen.getByRole('button', { name: /Post Reply/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe('/api/discussions/d-1/replies');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toEqual({ content: 'hello', parent_reply_id: 'parent-1' });
  });

  it('surfaces the server error message when the request fails', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'locked' }),
    });
    const onSuccess = vi.fn();
    render(
      <ReplyForm discussionId="d-1" onSuccess={onSuccess} onCancel={vi.fn()} />
    );
    await user.type(screen.getByTestId('reply-content'), 'nope');
    await user.click(screen.getByRole('button', { name: /Post Reply/ }));
    expect(await screen.findByText('locked')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('clicking Cancel calls onCancel without posting', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ReplyForm discussionId="d-1" onSuccess={vi.fn()} onCancel={onCancel} />
    );
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onCancel).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses "Reply to Comment" heading when parentReplyId is set', () => {
    render(
      <ReplyForm
        discussionId="d-1"
        parentReplyId="p-1"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Reply to Comment')).toBeInTheDocument();
  });

  it('uses "Add Reply" heading for top-level replies', () => {
    render(
      <ReplyForm discussionId="d-1" onSuccess={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText('Add Reply')).toBeInTheDocument();
  });
});
