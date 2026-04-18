// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextBlock from '../TextBlock';

vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

vi.mock('@/app/components/AutoResizeTextContent', () => ({
  __esModule: true,
  default: (props: { content: string }) => (
    <div data-testid="text-content" dangerouslySetInnerHTML={{ __html: props.content }} />
  ),
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof TextBlock>> = {}) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    title: 'Chapter 1',
    html: '<p>Hello</p>',
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    onRequestFullscreen: vi.fn(),
    ...overrides,
  };
}

describe('TextBlock — header variant (with title)', () => {
  it('renders the title in the header', () => {
    render(<TextBlock {...defaultProps({ title: 'Cells' })} />);
    expect(screen.getByText('Cells')).toBeInTheDocument();
  });

  it('renders the body content', () => {
    render(<TextBlock {...defaultProps({ html: '<p>Body text</p>' })} />);
    expect(screen.getByTestId('text-content').textContent).toContain('Body text');
  });

  it('calls onToggleCollapse when the header is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<TextBlock {...props} />);
    await user.click(screen.getByText('Chapter 1'));
    expect(props.onToggleCollapse).toHaveBeenCalled();
  });

  it('exposes a fullscreen button in the header that calls onRequestFullscreen with the title', async () => {
    const user = userEvent.setup();
    const props = defaultProps({ title: 'X', html: '<p>hi</p>' });
    render(<TextBlock {...props} />);
    const buttons = screen.getAllByTitle('View fullscreen');
    await user.click(buttons[0]);
    expect(props.onRequestFullscreen).toHaveBeenCalledWith('X', '<p>hi</p>');
  });

  it('stops header fullscreen click from triggering collapse toggle', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<TextBlock {...props} />);
    const fsButtons = screen.getAllByTitle('View fullscreen');
    await user.click(fsButtons[0]);
    expect(props.onRequestFullscreen).toHaveBeenCalled();
    expect(props.onToggleCollapse).not.toHaveBeenCalled();
  });
});

describe('TextBlock — headerless variant (no title)', () => {
  it('shows an inline fullscreen button above the body when there is no title', () => {
    render(<TextBlock {...defaultProps({ title: undefined })} />);
    expect(screen.getByTitle('View fullscreen')).toBeInTheDocument();
  });

  it('calls onRequestFullscreen with "Content" fallback title when no title given', async () => {
    const user = userEvent.setup();
    const props = defaultProps({ title: undefined, html: '<p>body</p>' });
    render(<TextBlock {...props} />);
    await user.click(screen.getByTitle('View fullscreen'));
    expect(props.onRequestFullscreen).toHaveBeenCalledWith('Content', '<p>body</p>');
  });
});

describe('TextBlock — completion checkbox', () => {
  it('reflects completion state', () => {
    render(<TextBlock {...defaultProps({ isComplete: true })} />);
    expect(
      screen.getByRole('button', { name: 'Mark as incomplete' })
    ).toBeInTheDocument();
  });
});
