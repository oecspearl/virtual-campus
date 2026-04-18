// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiscussionHeader from '../DiscussionHeader';
import type { Discussion } from '../hooks/useDiscussionData';

vi.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

function makeDiscussion(overrides: Partial<Discussion> = {}): Discussion {
  return {
    id: 'd-1',
    title: 'My Discussion',
    content: '<p>Body</p>',
    is_pinned: false,
    is_locked: false,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
    author: { id: 'u-1', name: 'Alice', email: 'a@x.com' },
    votes: [{ count: 4 }],
    ...overrides,
  };
}

describe('DiscussionHeader', () => {
  const originalFetch = global.fetch;
  const originalAlert = global.alert;
  const originalConfirm = global.confirm;
  const originalLocation = window.location;

  beforeEach(() => {
    global.fetch = vi.fn();
    global.alert = vi.fn();
    global.confirm = vi.fn().mockReturnValue(true);
    // jsdom blocks direct assignment to window.location; replace with a
    // writable stub we can assert against.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.alert = originalAlert;
    global.confirm = originalConfirm;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  it('renders title, sanitized content, author, and vote count', () => {
    render(
      <DiscussionHeader
        discussion={makeDiscussion()}
        discussionId="d-1"
        courseId="c-1"
        isInstructor={false}
        canModify={false}
        isEditing={false}
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={vi.fn()}
      />
    );
    expect(screen.getByText('My Discussion')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('by Alice')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows the graded + due-date pills when the discussion is graded with a due date', () => {
    render(
      <DiscussionHeader
        discussion={makeDiscussion({
          is_graded: true,
          points: 25,
          due_date: '2026-04-30',
        })}
        discussionId="d-1"
        courseId="c-1"
        isInstructor={false}
        canModify={false}
        isEditing={false}
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={vi.fn()}
      />
    );
    expect(screen.getByText(/Graded - 25 pts/)).toBeInTheDocument();
    expect(screen.getByText(/Due:/)).toBeInTheDocument();
  });

  it('shows pinned / locked indicators when flags are set', () => {
    render(
      <DiscussionHeader
        discussion={makeDiscussion({ is_pinned: true, is_locked: true })}
        discussionId="d-1"
        courseId="c-1"
        isInstructor={false}
        canModify={false}
        isEditing={false}
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={vi.fn()}
      />
    );
    expect(screen.getByText(/Pinned/)).toBeInTheDocument();
    expect(screen.getByText(/Locked/)).toBeInTheDocument();
  });

  it('hides Edit/Delete when canModify is false', () => {
    render(
      <DiscussionHeader
        discussion={makeDiscussion()}
        discussionId="d-1"
        courseId="c-1"
        isInstructor={false}
        canModify={false}
        isEditing={false}
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('hides the Edit button while an edit is already in progress', () => {
    render(
      <DiscussionHeader
        discussion={makeDiscussion()}
        discussionId="d-1"
        courseId="c-1"
        isInstructor={false}
        canModify
        isEditing
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('calls onStartEdit and onVote when those buttons are clicked', async () => {
    const user = userEvent.setup();
    const onStartEdit = vi.fn();
    const onVote = vi.fn();
    render(
      <DiscussionHeader
        discussion={makeDiscussion()}
        discussionId="d-1"
        courseId="c-1"
        isInstructor={false}
        canModify
        isEditing={false}
        onStartEdit={onStartEdit}
        onVote={onVote}
        onOpenGrader={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: /^4$/ }));
    expect(onStartEdit).toHaveBeenCalled();
    expect(onVote).toHaveBeenCalled();
  });

  it('shows the Grade Submissions CTA to instructors on graded discussions', async () => {
    const user = userEvent.setup();
    const onOpenGrader = vi.fn();
    render(
      <DiscussionHeader
        discussion={makeDiscussion({ is_graded: true, points: 30 })}
        discussionId="d-1"
        courseId="c-1"
        isInstructor
        canModify
        isEditing={false}
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={onOpenGrader}
      />
    );
    expect(screen.getByText(/Graded Discussion/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Grade Submissions/ }));
    expect(onOpenGrader).toHaveBeenCalled();
  });

  it('shows GradingInfoPanel to students and hides it from instructors', () => {
    const discussion = makeDiscussion({ is_graded: true, points: 50 });
    const { rerender } = render(
      <DiscussionHeader
        discussion={discussion}
        discussionId="d-1"
        courseId="c-1"
        isInstructor={false}
        canModify={false}
        isEditing={false}
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /Grading Information/ })
    ).toBeInTheDocument();

    rerender(
      <DiscussionHeader
        discussion={discussion}
        discussionId="d-1"
        courseId="c-1"
        isInstructor
        canModify={false}
        isEditing={false}
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={vi.fn()}
      />
    );
    expect(
      screen.queryByRole('button', { name: /Grading Information/ })
    ).not.toBeInTheDocument();
  });

  it('DELETEs and redirects on confirmed delete', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(
      <DiscussionHeader
        discussion={makeDiscussion()}
        discussionId="d-42"
        courseId="c-9"
        isInstructor={false}
        canModify
        isEditing={false}
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(window.location.href).toBe('/course/c-9'));
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe('/api/discussions/d-42');
    expect(init.method).toBe('DELETE');
  });

  it('does not DELETE when the user cancels the confirm dialog', async () => {
    const user = userEvent.setup();
    (global.confirm as any).mockReturnValue(false);

    render(
      <DiscussionHeader
        discussion={makeDiscussion()}
        discussionId="d-1"
        courseId="c-1"
        isInstructor={false}
        canModify
        isEditing={false}
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('alerts with the server error when delete fails', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'locked' }),
    });

    render(
      <DiscussionHeader
        discussion={makeDiscussion()}
        discussionId="d-1"
        courseId="c-1"
        isInstructor={false}
        canModify
        isEditing={false}
        onStartEdit={vi.fn()}
        onVote={vi.fn()}
        onOpenGrader={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('locked'));
    expect(window.location.href).toBe('');
  });
});
