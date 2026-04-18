// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioBlock from '../AudioBlock';

vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

vi.mock('@/app/components/media/AudioPlayer', () => ({
  __esModule: true,
  default: (props: { src: string; title: string; transcript?: string }) => (
    <div
      data-testid="audio-player-stub"
      data-src={props.src}
      data-title={props.title}
      data-transcript={props.transcript || ''}
    />
  ),
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof AudioBlock>> = {}) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    title: 'My Audio',
    fileId: 'audio-abc',
    url: undefined,
    fileName: undefined,
    transcript: undefined,
    showTranscript: undefined,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    ...overrides,
  };
}

describe('AudioBlock — source resolution', () => {
  it('uses the explicit url when provided', () => {
    render(<AudioBlock {...defaultProps({ url: 'https://cdn.example.com/a.mp3' })} />);
    const player = screen.getByTestId('audio-player-stub');
    expect(player.getAttribute('data-src')).toBe('https://cdn.example.com/a.mp3');
  });

  it('falls back to /api/files/:fileId when only fileId is provided', () => {
    render(<AudioBlock {...defaultProps({ fileId: 'abc123' })} />);
    expect(screen.getByTestId('audio-player-stub').getAttribute('data-src')).toBe(
      '/api/files/abc123'
    );
  });

  it('shows the empty-state placeholder when no src is available', () => {
    render(<AudioBlock {...defaultProps({ url: undefined, fileId: undefined })} />);
    expect(screen.queryByTestId('audio-player-stub')).not.toBeInTheDocument();
    expect(screen.getByText(/Audio not uploaded yet/)).toBeInTheDocument();
  });
});

describe('AudioBlock — title and header', () => {
  it('omits the header when no title', () => {
    const { container } = render(<AudioBlock {...defaultProps({ title: undefined })} />);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('toggles collapse when the header is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<AudioBlock {...props} />);
    await user.click(screen.getByText('My Audio'));
    expect(props.onToggleCollapse).toHaveBeenCalled();
  });
});

describe('AudioBlock — title fallback chain', () => {
  it('passes title → fileName → "Audio Content" as the player title', () => {
    const { rerender } = render(<AudioBlock {...defaultProps({ title: 'Song A' })} />);
    expect(screen.getByTestId('audio-player-stub').getAttribute('data-title')).toBe('Song A');

    rerender(<AudioBlock {...defaultProps({ title: undefined, fileName: 'track.mp3' })} />);
    expect(screen.getByTestId('audio-player-stub').getAttribute('data-title')).toBe('track.mp3');

    rerender(<AudioBlock {...defaultProps({ title: undefined, fileName: undefined })} />);
    expect(screen.getByTestId('audio-player-stub').getAttribute('data-title')).toBe(
      'Audio Content'
    );
  });
});

describe('AudioBlock — transcript', () => {
  it('passes transcript through to the player', () => {
    render(<AudioBlock {...defaultProps({ transcript: 'Line one...' })} />);
    expect(screen.getByTestId('audio-player-stub').getAttribute('data-transcript')).toBe(
      'Line one...'
    );
  });
});
