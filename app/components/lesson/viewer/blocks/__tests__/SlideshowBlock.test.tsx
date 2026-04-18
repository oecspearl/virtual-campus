// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SlideshowBlock from '../SlideshowBlock';

vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

vi.mock('@/app/components/media/SlideshowViewer', () => ({
  __esModule: true,
  default: (props: { url: string; title: string; embedType: string }) => (
    <div
      data-testid="slideshow-viewer-stub"
      data-url={props.url}
      data-title={props.title}
      data-embed={props.embedType}
    />
  ),
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof SlideshowBlock>> = {}) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    url: 'https://docs.google.com/presentation/d/abc/edit',
    title: 'My Slides',
    embedType: undefined,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    ...overrides,
  };
}

describe('SlideshowBlock — missing URL fallback', () => {
  it('renders the instructor-facing error card when URL is empty', () => {
    render(<SlideshowBlock {...defaultProps({ url: '' })} />);
    expect(
      screen.getByText(/No slideshow URL provided/)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('slideshow-viewer-stub')).not.toBeInTheDocument();
  });

  it('treats whitespace-only URLs as missing', () => {
    render(<SlideshowBlock {...defaultProps({ url: '   ' })} />);
    expect(screen.getByText(/No slideshow URL provided/)).toBeInTheDocument();
  });
});

describe('SlideshowBlock — normal render', () => {
  it('passes the URL (trimmed) to SlideshowViewer', () => {
    render(
      <SlideshowBlock
        {...defaultProps({ url: '  https://docs.google.com/presentation/d/x/edit  ' })}
      />
    );
    const stub = screen.getByTestId('slideshow-viewer-stub');
    expect(stub.getAttribute('data-url')).toBe(
      'https://docs.google.com/presentation/d/x/edit'
    );
  });

  it('defaults embedType to "auto" when not provided', () => {
    render(<SlideshowBlock {...defaultProps({ embedType: undefined })} />);
    expect(screen.getByTestId('slideshow-viewer-stub').getAttribute('data-embed')).toBe(
      'auto'
    );
  });

  it('respects a custom embedType', () => {
    render(<SlideshowBlock {...defaultProps({ embedType: 'google-slides' })} />);
    expect(screen.getByTestId('slideshow-viewer-stub').getAttribute('data-embed')).toBe(
      'google-slides'
    );
  });

  it('falls back to "Slideshow" when no title provided', () => {
    render(<SlideshowBlock {...defaultProps({ title: undefined })} />);
    // Both header and viewer-stub receive the display title
    expect(screen.getAllByText('Slideshow').length).toBeGreaterThan(0);
  });
});

describe('SlideshowBlock — interaction', () => {
  it('calls onToggleCollapse when the header is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<SlideshowBlock {...props} />);
    await user.click(screen.getByText('My Slides'));
    expect(props.onToggleCollapse).toHaveBeenCalled();
  });

  it('reflects completion state in the progress checkbox', () => {
    render(<SlideshowBlock {...defaultProps({ isComplete: true })} />);
    expect(
      screen.getByRole('button', { name: 'Mark as incomplete' })
    ).toBeInTheDocument();
  });
});
