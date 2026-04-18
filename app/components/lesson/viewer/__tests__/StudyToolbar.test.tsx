// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudyToolbar from '../StudyToolbar';

// BookmarkButton makes network calls — stub it out for unit tests.
vi.mock('@/app/components/student', () => ({
  BookmarkButton: ({ id }: { id: string }) => (
    <div data-testid="bookmark-button-stub" data-id={id} />
  ),
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof StudyToolbar>> = {}) {
  return {
    allCollapsed: false,
    collapsedCount: 0,
    lessonId: 'lesson-1',
    onCollapseAll: vi.fn(),
    onExpandAll: vi.fn(),
    onOpenNotes: vi.fn(),
    ...overrides,
  };
}

describe('StudyToolbar — collapse toggle', () => {
  it('shows the "Collapse all sections" title when not all sections are collapsed', () => {
    render(<StudyToolbar {...defaultProps({ allCollapsed: false })} />);
    expect(screen.getByTitle('Collapse all sections')).toBeInTheDocument();
  });

  it('shows the "Expand all sections" title when all sections are collapsed', () => {
    render(<StudyToolbar {...defaultProps({ allCollapsed: true })} />);
    expect(screen.getByTitle('Expand all sections')).toBeInTheDocument();
  });

  it('calls onCollapseAll when toggle is clicked in the non-collapsed state', async () => {
    const user = userEvent.setup();
    const props = defaultProps({ allCollapsed: false });
    render(<StudyToolbar {...props} />);
    await user.click(screen.getByTitle('Collapse all sections'));
    expect(props.onCollapseAll).toHaveBeenCalled();
    expect(props.onExpandAll).not.toHaveBeenCalled();
  });

  it('calls onExpandAll when toggle is clicked in the collapsed state', async () => {
    const user = userEvent.setup();
    const props = defaultProps({ allCollapsed: true });
    render(<StudyToolbar {...props} />);
    await user.click(screen.getByTitle('Expand all sections'));
    expect(props.onExpandAll).toHaveBeenCalled();
    expect(props.onCollapseAll).not.toHaveBeenCalled();
  });
});

describe('StudyToolbar — collapsed count hint', () => {
  it('shows "N collapsed" when some sections are collapsed', () => {
    render(<StudyToolbar {...defaultProps({ collapsedCount: 3 })} />);
    expect(screen.getByText(/3 collapsed/)).toBeInTheDocument();
  });

  it('hides the count hint when zero sections are collapsed', () => {
    render(<StudyToolbar {...defaultProps({ collapsedCount: 0 })} />);
    expect(screen.queryByText(/collapsed/)).not.toBeInTheDocument();
  });
});

describe('StudyToolbar — study tools', () => {
  it('renders the bookmark button wired to the lesson id', () => {
    render(<StudyToolbar {...defaultProps({ lessonId: 'lesson-xyz' })} />);
    const bookmark = screen.getByTestId('bookmark-button-stub');
    expect(bookmark.getAttribute('data-id')).toBe('lesson-xyz');
  });

  it('calls onOpenNotes when the notes button is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<StudyToolbar {...props} />);
    await user.click(screen.getByTitle('Open notes'));
    expect(props.onOpenNotes).toHaveBeenCalled();
  });
});
