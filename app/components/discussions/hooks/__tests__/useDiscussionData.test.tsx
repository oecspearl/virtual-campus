// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDiscussionData } from '../useDiscussionData';

function Harness({ discussionId = 'd-1' }: { discussionId?: string }) {
  const {
    discussion,
    replies,
    loading,
    error,
    refetch,
    voteDiscussion,
    voteReply,
    deleteReply,
  } = useDiscussionData(discussionId);

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="error">{error ?? ''}</div>
      <div data-testid="title">{discussion?.title ?? ''}</div>
      <div data-testid="reply-count">{replies.length}</div>
      <button onClick={() => refetch()}>Refetch</button>
      <button onClick={() => voteDiscussion('d-1', 'up')}>VoteDiscussion</button>
      <button onClick={() => voteReply('r-1', 'up')}>VoteReply</button>
      <button onClick={() => deleteReply('r-1')}>DeleteReply</button>
    </div>
  );
}

describe('useDiscussionData', () => {
  const originalFetch = global.fetch;
  const originalAlert = global.alert;

  beforeEach(() => {
    global.fetch = vi.fn();
    global.alert = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.alert = originalAlert;
    vi.restoreAllMocks();
  });

  it('fetches the discussion on mount and exposes discussion + replies', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        discussion: { id: 'd-1', title: 'Welcome' },
        replies: [{ id: 'r-1' }, { id: 'r-2' }],
      }),
    });
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(screen.getByTestId('title').textContent).toBe('Welcome');
    expect(screen.getByTestId('reply-count').textContent).toBe('2');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('sets error when the initial fetch fails', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false });
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('Failed to fetch discussion')
    );
    expect(screen.getByTestId('title').textContent).toBe('');
  });

  it('voteDiscussion POSTs the right payload and refetches on success', async () => {
    const user = userEvent.setup();
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ discussion: { id: 'd-1', title: 'v1' }, replies: [] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ discussion: { id: 'd-1', title: 'v2' }, replies: [] }),
      });

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('title').textContent).toBe('v1')
    );

    await user.click(screen.getByRole('button', { name: 'VoteDiscussion' }));

    const voteCall = (global.fetch as any).mock.calls[1];
    expect(voteCall[0]).toBe('/api/discussions/vote');
    expect(voteCall[1].method).toBe('POST');
    const body = JSON.parse(voteCall[1].body);
    expect(body).toEqual({ discussion_id: 'd-1', vote_type: 'up' });

    await waitFor(() =>
      expect(screen.getByTestId('title').textContent).toBe('v2')
    );
  });

  it('voteReply POSTs reply_id and refetches', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ discussion: { id: 'd-1', title: 'x' }, replies: [] }),
    });
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await user.click(screen.getByRole('button', { name: 'VoteReply' }));
    const voteCall = (global.fetch as any).mock.calls.find(
      ([url]: [string]) => url === '/api/discussions/vote'
    );
    const body = JSON.parse(voteCall[1].body);
    expect(body).toEqual({ reply_id: 'r-1', vote_type: 'up' });
  });

  it('deleteReply DELETEs and alerts on server error', async () => {
    const user = userEvent.setup();
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ discussion: { id: 'd-1', title: 'x' }, replies: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'locked' }),
      });
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await user.click(screen.getByRole('button', { name: 'DeleteReply' }));

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('locked'));
    const deleteCall = (global.fetch as any).mock.calls[1];
    expect(deleteCall[0]).toBe('/api/discussions/d-1/replies/r-1');
    expect(deleteCall[1].method).toBe('DELETE');
  });

  it('deleteReply refetches on success', async () => {
    const user = userEvent.setup();
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          discussion: { id: 'd-1', title: 'x' },
          replies: [{ id: 'r-1' }, { id: 'r-2' }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          discussion: { id: 'd-1', title: 'x' },
          replies: [{ id: 'r-2' }],
        }),
      });
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('reply-count').textContent).toBe('2')
    );

    await user.click(screen.getByRole('button', { name: 'DeleteReply' }));
    await waitFor(() =>
      expect(screen.getByTestId('reply-count').textContent).toBe('1')
    );
  });
});
