// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageBlock from '../ImageBlock';

// BookmarkButton makes network calls — stub it.
vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof ImageBlock>> = {}) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    title: 'Diagram',
    fileId: 'file-abc',
    url: undefined,
    alt: undefined,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    ...overrides,
  };
}

describe('ImageBlock — header', () => {
  it('renders the title inside the header when provided', () => {
    render(<ImageBlock {...defaultProps({ title: 'My Diagram' })} />);
    expect(screen.getByText('My Diagram')).toBeInTheDocument();
  });

  it('omits the header entirely when no title is provided', () => {
    const { container } = render(<ImageBlock {...defaultProps({ title: undefined })} />);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('calls onToggleCollapse when the header is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<ImageBlock {...props} />);
    await user.click(screen.getByText('Diagram'));
    expect(props.onToggleCollapse).toHaveBeenCalled();
  });

  it('renders the progress checkbox with the correct state', () => {
    render(<ImageBlock {...defaultProps({ isComplete: true })} />);
    expect(
      screen.getByRole('button', { name: 'Mark as incomplete' })
    ).toBeInTheDocument();
  });
});

describe('ImageBlock — body', () => {
  it('renders the image using the explicit url when provided', () => {
    const { container } = render(
      <ImageBlock {...defaultProps({ url: 'https://example.com/pic.jpg' })} />
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/pic.jpg');
  });

  it('falls back to /api/files/:fileId when only fileId is provided', () => {
    const { container } = render(<ImageBlock {...defaultProps({ fileId: 'abc123' })} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/api/files/abc123');
  });

  it('uses alt text when provided, else falls back to title', () => {
    const { rerender, container } = render(
      <ImageBlock {...defaultProps({ alt: 'cross-section' })} />
    );
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('cross-section');

    rerender(<ImageBlock {...defaultProps({ alt: undefined, title: 'Diagram' })} />);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Diagram');
  });

  it('shows the empty-state placeholder when no url or fileId', () => {
    render(<ImageBlock {...defaultProps({ url: undefined, fileId: undefined })} />);
    expect(screen.getByText(/Image not uploaded yet/)).toBeInTheDocument();
  });
});

describe('ImageBlock — collapse state', () => {
  it('shows ChevronDown when collapsed', () => {
    const { container } = render(<ImageBlock {...defaultProps({ isCollapsed: true })} />);
    // Just verify the body class applies max-h-0
    const body = container.querySelector('.max-h-0');
    expect(body).toBeTruthy();
  });

  it('expands the body when not collapsed', () => {
    const { container } = render(<ImageBlock {...defaultProps({ isCollapsed: false })} />);
    const body = container.querySelector('.max-h-\\[5000px\\]');
    expect(body).toBeTruthy();
  });
});
