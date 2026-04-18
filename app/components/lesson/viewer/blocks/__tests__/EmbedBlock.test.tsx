// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmbedBlock from '../EmbedBlock';

// Stub BookmarkButton — it touches the network.
vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

// Stub GoogleFileEmbed so we can assert "was it used?" without pulling
// in its full rendering logic.
vi.mock('@/app/components/media/GoogleFileEmbed', () => ({
  __esModule: true,
  default: (props: { url: string; title: string }) => (
    <div data-testid="google-embed-stub" data-url={props.url} />
  ),
  isGoogleWorkspaceUrl: (url: string) =>
    url.includes('docs.google.com') ||
    url.includes('sheets.google.com') ||
    url.includes('slides.google.com'),
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof EmbedBlock>> = {}) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    title: 'My Embed',
    url: 'https://example.com/thing',
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    ...overrides,
  };
}

describe('EmbedBlock — header', () => {
  it('shows the provided title', () => {
    render(<EmbedBlock {...defaultProps({ title: 'Article' })} />);
    expect(screen.getByText('Article')).toBeInTheDocument();
  });

  it('falls back to "Embedded Content" when no title provided', () => {
    render(<EmbedBlock {...defaultProps({ title: undefined })} />);
    expect(screen.getByText('Embedded Content')).toBeInTheDocument();
  });

  it('toggles collapse when the header is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<EmbedBlock {...props} />);
    await user.click(screen.getByText('My Embed'));
    expect(props.onToggleCollapse).toHaveBeenCalled();
  });

  it('uses GoogleFileEmbed for Google Workspace URLs', () => {
    render(
      <EmbedBlock
        {...defaultProps({ url: 'https://docs.google.com/document/d/xyz/edit' })}
      />
    );
    const stub = screen.getByTestId('google-embed-stub');
    expect(stub.getAttribute('data-url')).toBe('https://docs.google.com/document/d/xyz/edit');
  });
});

describe('EmbedBlock — non-Google iframe', () => {
  it('renders a sandboxed iframe for generic URLs', () => {
    const { container } = render(
      <EmbedBlock {...defaultProps({ url: 'https://arxiv.org/abs/1234.5678' })} />
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute('src')).toBe('https://arxiv.org/abs/1234.5678');
    expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
    expect(iframe?.getAttribute('sandbox')).toContain('allow-same-origin');
    expect(iframe?.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('does NOT render GoogleFileEmbed for non-Google URLs', () => {
    render(<EmbedBlock {...defaultProps({ url: 'https://arxiv.org/abs/1234' })} />);
    expect(screen.queryByTestId('google-embed-stub')).not.toBeInTheDocument();
  });
});

describe('EmbedBlock — progress checkbox', () => {
  it('reflects the completion state', () => {
    render(<EmbedBlock {...defaultProps({ isComplete: true })} />);
    expect(
      screen.getByRole('button', { name: 'Mark as incomplete' })
    ).toBeInTheDocument();
  });
});
