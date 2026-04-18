// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Stub the heavy sub-players so we only test VideoPlayer's routing logic —
// "given this src, which child component is rendered?".
vi.mock('@/app/components/media/video/EmbedPlayer', () => ({
  default: (props: { src: string }) => (
    <div data-testid="embed-player" data-src={props.src} />
  ),
}));

vi.mock('@/app/components/media/VideoNotesPanel', () => ({
  default: () => <div data-testid="video-notes-panel-stub" />,
}));

// Import AFTER mocks so they take effect.
import VideoPlayer from '@/app/components/media/VideoPlayer';

describe('VideoPlayer — routing', () => {
  it('renders EmbedPlayer for YouTube URLs', () => {
    render(<VideoPlayer src="https://www.youtube.com/watch?v=abc12345678" />);
    expect(screen.getByTestId('embed-player')).toBeInTheDocument();
  });

  it('renders EmbedPlayer for youtu.be short URLs', () => {
    render(<VideoPlayer src="https://youtu.be/abc12345678" />);
    expect(screen.getByTestId('embed-player')).toBeInTheDocument();
  });

  it('renders EmbedPlayer for Vimeo URLs', () => {
    render(<VideoPlayer src="https://vimeo.com/123456789" />);
    expect(screen.getByTestId('embed-player')).toBeInTheDocument();
  });

  it('does NOT render EmbedPlayer for self-hosted video URLs', () => {
    const { container } = render(<VideoPlayer src="https://example.com/my-video.mp4" />);
    expect(screen.queryByTestId('embed-player')).not.toBeInTheDocument();
    // Self-hosted player renders a <video> element
    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('passes the src through to EmbedPlayer for YouTube', () => {
    render(<VideoPlayer src="https://www.youtube.com/watch?v=abc12345678" />);
    const embed = screen.getByTestId('embed-player');
    expect(embed.getAttribute('data-src')).toBe('https://www.youtube.com/watch?v=abc12345678');
  });
});
