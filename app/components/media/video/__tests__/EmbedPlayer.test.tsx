// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmbedPlayer from '../EmbedPlayer';

// VideoNotesPanel makes network/auth calls we don't want in unit tests —
// stub it out so we can focus on EmbedPlayer's own rendering logic.
vi.mock('@/app/components/media/VideoNotesPanel', () => ({
  default: () => <div data-testid="video-notes-panel-stub" />,
}));

// jsdom doesn't implement scrollIntoView — stub it.
Element.prototype.scrollIntoView = vi.fn();

describe('EmbedPlayer — YouTube/Vimeo URL conversion', () => {
  it('converts a YouTube watch URL into an embed iframe', () => {
    const { container } = render(<EmbedPlayer src="https://www.youtube.com/watch?v=abc12345678" />);
    const iframe = container.querySelector('iframe')!;
    expect(iframe.src).toBe('https://www.youtube.com/embed/abc12345678');
  });

  it('converts a youtu.be short URL into an embed iframe', () => {
    const { container } = render(<EmbedPlayer src="https://youtu.be/abc12345678" />);
    const iframe = container.querySelector('iframe')!;
    expect(iframe.src).toBe('https://www.youtube.com/embed/abc12345678');
  });

  it('converts a Vimeo URL into a player.vimeo.com embed', () => {
    const { container } = render(<EmbedPlayer src="https://vimeo.com/123456789" />);
    const iframe = container.querySelector('iframe')!;
    expect(iframe.src).toBe('https://player.vimeo.com/video/123456789');
  });

  it('applies the video title to the iframe title attribute', () => {
    const { container } = render(
      <EmbedPlayer src="https://www.youtube.com/watch?v=abc12345678" title="My Lesson" />
    );
    expect(container.querySelector('iframe')!.title).toBe('My Lesson');
  });

  it('falls back to "Video" when no title is provided', () => {
    const { container } = render(<EmbedPlayer src="https://www.youtube.com/watch?v=abc12345678" />);
    expect(container.querySelector('iframe')!.title).toBe('Video');
  });
});

describe('EmbedPlayer — sidebar layout', () => {
  it('renders without a sidebar when there are no chapters and notes are off', () => {
    render(<EmbedPlayer src="https://www.youtube.com/watch?v=abc12345678" />);
    expect(screen.queryByText(/^Chapters$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Notes$/)).not.toBeInTheDocument();
  });

  it('shows the chapters-only sidebar when only chapters are provided', () => {
    render(
      <EmbedPlayer
        src="https://www.youtube.com/watch?v=abc12345678"
        chapters={[
          { time: 0, title: 'Intro' },
          { time: 60, title: 'Middle' },
        ]}
      />
    );
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Middle')).toBeInTheDocument();
  });

  it('shows only the notes panel when showNotes is on and lessonId is set (no chapters)', () => {
    render(
      <EmbedPlayer
        src="https://www.youtube.com/watch?v=abc12345678"
        showNotes
        lessonId="lesson-1"
      />
    );
    expect(screen.getByTestId('video-notes-panel-stub')).toBeInTheDocument();
  });

  it('renders an empty sidebar (no notes panel) when showNotes is on without lessonId', () => {
    render(<EmbedPlayer src="https://www.youtube.com/watch?v=abc12345678" showNotes />);
    // No notes panel should render without a lessonId
    expect(screen.queryByTestId('video-notes-panel-stub')).not.toBeInTheDocument();
  });

  it('shows chapter / notes tabs when both are enabled', () => {
    render(
      <EmbedPlayer
        src="https://www.youtube.com/watch?v=abc12345678"
        chapters={[{ time: 0, title: 'Intro' }]}
        showNotes
        lessonId="lesson-1"
      />
    );
    // Tab buttons should exist
    const buttons = screen.getAllByRole('button');
    expect(buttons.some((b) => b.textContent === 'Chapters')).toBe(true);
    expect(buttons.some((b) => b.textContent === 'Notes')).toBe(true);
  });

  it('can switch between chapter and notes tabs', async () => {
    const user = userEvent.setup();
    render(
      <EmbedPlayer
        src="https://www.youtube.com/watch?v=abc12345678"
        chapters={[{ time: 0, title: 'Intro' }]}
        showNotes
        lessonId="lesson-1"
      />
    );

    // Starts on chapters
    expect(screen.getByText('Intro')).toBeInTheDocument();

    // Click Notes tab
    const notesButtons = screen.getAllByRole('button');
    const notesTab = notesButtons.find((b) => b.textContent === 'Notes')!;
    await user.click(notesTab);

    expect(screen.getByTestId('video-notes-panel-stub')).toBeInTheDocument();
  });
});

describe('EmbedPlayer — onSeekRef', () => {
  it('exposes a seek function via onSeekRef', () => {
    const seekRef: React.MutableRefObject<((time: number) => void) | null> = { current: null };

    render(<EmbedPlayer src="https://www.youtube.com/watch?v=abc12345678" onSeekRef={seekRef} />);

    expect(typeof seekRef.current).toBe('function');
  });

  it('clears the ref on unmount', () => {
    const seekRef: React.MutableRefObject<((time: number) => void) | null> = { current: null };

    const { unmount } = render(
      <EmbedPlayer src="https://www.youtube.com/watch?v=abc12345678" onSeekRef={seekRef} />
    );

    expect(seekRef.current).not.toBeNull();
    unmount();
    expect(seekRef.current).toBeNull();
  });
});
