// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReplyItem, { type Reply } from '../ReplyItem';

// Swap useSupabase for a controlled stub — each test sets `currentUser` to
// influence which actions are visible.
let currentUser: { id: string } | null = null;
vi.mock('@/lib/supabase-provider', () => ({
  useSupabase: () => ({ user: currentUser }),
}));

function makeReply(overrides: Partial<Reply> = {}): Reply {
  return {
    id: 'r-1',
    content: '<p>hello</p>',
    is_solution: false,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
    author: { id: 'u-1', name: 'Alice', email: 'a@x.com' },
    children: [],
    votes: [{ count: 3 }],
    discussion_id: 'd-1',
    ...overrides,
  };
}

describe('ReplyItem', () => {
  beforeEach(() => {
    currentUser = { id: 'u-1' };
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders author, content, and vote count', () => {
    render(
      <ReplyItem
        reply={makeReply()}
        onReply={vi.fn()}
        onVote={vi.fn()}
        onSolution={vi.fn()}
        onDelete={vi.fn()}
        isInstructor={false}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('clicking the vote button calls onVote with the reply id and direction', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    render(
      <ReplyItem
        reply={makeReply({ id: 'r-42' })}
        onReply={vi.fn()}
        onVote={onVote}
        onSolution={vi.fn()}
        onDelete={vi.fn()}
        isInstructor={false}
      />
    );
    await user.click(screen.getByRole('button', { name: /3/ }));
    expect(onVote).toHaveBeenCalledWith('r-42', 'up');
  });

  it('clicking Reply calls onReply with the reply id', async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(
      <ReplyItem
        reply={makeReply({ id: 'r-7' })}
        onReply={onReply}
        onVote={vi.fn()}
        onSolution={vi.fn()}
        onDelete={vi.fn()}
        isInstructor={false}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Reply' }));
    expect(onReply).toHaveBeenCalledWith('r-7');
  });

  it('shows Delete to the author and hides it for other users', () => {
    currentUser = { id: 'u-1' };
    const { rerender } = render(
      <ReplyItem
        reply={makeReply({ author: { id: 'u-1', name: 'Alice', email: 'a@x.com' } })}
        onReply={vi.fn()}
        onVote={vi.fn()}
        onSolution={vi.fn()}
        onDelete={vi.fn()}
        isInstructor={false}
      />
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    currentUser = { id: 'u-2' };
    rerender(
      <ReplyItem
        reply={makeReply({ author: { id: 'u-1', name: 'Alice', email: 'a@x.com' } })}
        onReply={vi.fn()}
        onVote={vi.fn()}
        onSolution={vi.fn()}
        onDelete={vi.fn()}
        isInstructor={false}
      />
    );
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows Delete to instructors even when not the author', () => {
    currentUser = { id: 'u-mod' };
    render(
      <ReplyItem
        reply={makeReply()}
        onReply={vi.fn()}
        onVote={vi.fn()}
        onSolution={vi.fn()}
        onDelete={vi.fn()}
        isInstructor
      />
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('hides "Mark as Solution" when the reply is already the solution', () => {
    render(
      <ReplyItem
        reply={makeReply({ is_solution: true })}
        onReply={vi.fn()}
        onVote={vi.fn()}
        onSolution={vi.fn()}
        onDelete={vi.fn()}
        isInstructor={false}
      />
    );
    expect(screen.queryByRole('button', { name: /Mark as Solution/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Solution/)).toBeInTheDocument();
  });

  it('hides "Mark as Solution" for logged-out users', () => {
    currentUser = null;
    render(
      <ReplyItem
        reply={makeReply()}
        onReply={vi.fn()}
        onVote={vi.fn()}
        onSolution={vi.fn()}
        onDelete={vi.fn()}
        isInstructor={false}
      />
    );
    expect(screen.queryByRole('button', { name: /Mark as Solution/ })).not.toBeInTheDocument();
  });

  it('renders nested children recursively', () => {
    const child = makeReply({
      id: 'r-child',
      author: { id: 'u-2', name: 'Bob', email: 'b@x.com' },
      content: '<p>child reply</p>',
    });
    render(
      <ReplyItem
        reply={makeReply({ children: [child] })}
        onReply={vi.fn()}
        onVote={vi.fn()}
        onSolution={vi.fn()}
        onDelete={vi.fn()}
        isInstructor={false}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('child reply')).toBeInTheDocument();
  });
});
