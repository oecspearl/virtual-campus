// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoSidebar from '../VideoSidebar';
import { type VideoChapter } from '../ChapterSidebar';

// VideoNotesPanel makes network/auth calls — stub it.
vi.mock('@/app/components/media/VideoNotesPanel', () => ({
  default: () => <div data-testid="notes-panel-stub" />,
}));

// ChapterSidebar's auto-scroll effect calls scrollIntoView.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const CHAPTERS: VideoChapter[] = [
  { time: 0, title: 'Intro' },
  { time: 60, title: 'Middle' },
  { time: 120, title: 'End' },
];

describe('VideoSidebar — layout selection', () => {
  it('renders just the video when no chapters and notes are off', () => {
    render(
      <VideoSidebar chapters={[]} currentTime={0} onSeek={() => {}}>
        <div data-testid="video">video</div>
      </VideoSidebar>
    );
    expect(screen.getByTestId('video')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-panel-stub')).not.toBeInTheDocument();
    expect(screen.queryByText('Intro')).not.toBeInTheDocument();
  });

  it('renders chapters-only when only chapters are provided', () => {
    render(
      <VideoSidebar chapters={CHAPTERS} currentTime={0} onSeek={() => {}}>
        <div data-testid="video" />
      </VideoSidebar>
    );
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Middle')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-panel-stub')).not.toBeInTheDocument();
  });

  it('renders notes-only when showNotes is on with a lessonId (no chapters)', () => {
    render(
      <VideoSidebar
        chapters={[]}
        showNotes
        lessonId="lesson-1"
        currentTime={0}
        onSeek={() => {}}
      >
        <div data-testid="video" />
      </VideoSidebar>
    );
    expect(screen.getByTestId('notes-panel-stub')).toBeInTheDocument();
    expect(screen.queryByText('Intro')).not.toBeInTheDocument();
  });

  it('renders nothing in the sidebar when showNotes is on but no lessonId', () => {
    render(
      <VideoSidebar chapters={[]} showNotes currentTime={0} onSeek={() => {}}>
        <div data-testid="video" />
      </VideoSidebar>
    );
    expect(screen.queryByTestId('notes-panel-stub')).not.toBeInTheDocument();
  });
});

describe('VideoSidebar — tabs (both chapters and notes)', () => {
  function renderTabs() {
    return render(
      <VideoSidebar
        chapters={CHAPTERS}
        showNotes
        lessonId="lesson-1"
        currentTime={0}
        onSeek={() => {}}
      >
        <div data-testid="video" />
      </VideoSidebar>
    );
  }

  it('shows both tab buttons when chapters and notes are both available', () => {
    renderTabs();
    const chapTab = screen.getByRole('button', { name: 'Chapters' });
    const notesTab = screen.getByRole('button', { name: 'Notes' });
    expect(chapTab).toBeInTheDocument();
    expect(notesTab).toBeInTheDocument();
  });

  it('defaults to the chapters tab', () => {
    renderTabs();
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-panel-stub')).not.toBeInTheDocument();
  });

  it('switches to the notes panel when Notes tab is clicked', async () => {
    const user = userEvent.setup();
    renderTabs();
    await user.click(screen.getByRole('button', { name: 'Notes' }));
    expect(screen.getByTestId('notes-panel-stub')).toBeInTheDocument();
  });

  it('switches back to chapters when Chapters tab is re-clicked', async () => {
    const user = userEvent.setup();
    renderTabs();
    await user.click(screen.getByRole('button', { name: 'Notes' }));
    await user.click(screen.getByRole('button', { name: 'Chapters' }));
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-panel-stub')).not.toBeInTheDocument();
  });

  it('shows "Notes require a saved lesson" when notes tab is selected without a lessonId', async () => {
    const user = userEvent.setup();
    render(
      <VideoSidebar
        chapters={CHAPTERS}
        showNotes
        currentTime={0}
        onSeek={() => {}}
      >
        <div data-testid="video" />
      </VideoSidebar>
    );
    await user.click(screen.getByRole('button', { name: 'Notes' }));
    expect(screen.getByText(/Notes require a saved lesson/)).toBeInTheDocument();
  });
});

describe('VideoSidebar — onSeek passthrough', () => {
  it('forwards chapter clicks to onSeek', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    render(
      <VideoSidebar chapters={CHAPTERS} currentTime={0} onSeek={onSeek}>
        <div data-testid="video" />
      </VideoSidebar>
    );
    await user.click(screen.getByText('Middle'));
    expect(onSeek).toHaveBeenCalledWith(60);
  });
});

describe('VideoSidebar — children rendering', () => {
  it('always renders the children (the video element)', () => {
    render(
      <VideoSidebar chapters={CHAPTERS} currentTime={0} onSeek={() => {}}>
        <div data-testid="video" />
      </VideoSidebar>
    );
    expect(screen.getByTestId('video')).toBeInTheDocument();
  });
});
