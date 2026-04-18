// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChapterSidebar, { type VideoChapter } from '../ChapterSidebar';

// jsdom doesn't implement scrollIntoView — stub it so the auto-scroll
// effect doesn't crash during tests.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const SAMPLE_CHAPTERS: VideoChapter[] = [
  { time: 0, title: 'Introduction' },
  { time: 60, title: 'The main idea' },
  { time: 180, title: 'Worked example' },
  { time: 300, title: 'Summary' },
];

describe('ChapterSidebar', () => {
  it('renders nothing when chapters is empty', () => {
    const { container } = render(
      <ChapterSidebar chapters={[]} onSeek={() => {}} currentTime={0} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders every chapter title', () => {
    render(<ChapterSidebar chapters={SAMPLE_CHAPTERS} onSeek={() => {}} currentTime={0} />);

    for (const chapter of SAMPLE_CHAPTERS) {
      expect(screen.getByText(chapter.title)).toBeInTheDocument();
    }
  });

  it('renders the chapter count in the header', () => {
    render(<ChapterSidebar chapters={SAMPLE_CHAPTERS} onSeek={() => {}} currentTime={0} />);
    expect(screen.getByText(/^\(4\)$/)).toBeInTheDocument();
  });

  it('formats chapter times as mm:ss', () => {
    render(<ChapterSidebar chapters={SAMPLE_CHAPTERS} onSeek={() => {}} currentTime={0} />);

    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText('1:00')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
    expect(screen.getByText('5:00')).toBeInTheDocument();
  });

  it('calls onSeek with the chapter time when a chapter is clicked', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();

    render(<ChapterSidebar chapters={SAMPLE_CHAPTERS} onSeek={onSeek} currentTime={0} />);

    await user.click(screen.getByText('Worked example'));

    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(180);
  });

  it('marks the correct chapter as active based on currentTime', () => {
    // currentTime = 200 → should highlight the 3rd chapter ("Worked example" at 180s)
    render(<ChapterSidebar chapters={SAMPLE_CHAPTERS} onSeek={() => {}} currentTime={200} />);

    const activeButton = screen.getByText('Worked example').closest('button')!;
    expect(activeButton.className).toMatch(/bg-blue-100/);
    expect(activeButton.className).toMatch(/text-blue-800/);
  });

  it('highlights the first chapter when currentTime is before any chapter', () => {
    render(<ChapterSidebar chapters={SAMPLE_CHAPTERS} onSeek={() => {}} currentTime={0} />);

    const first = screen.getByText('Introduction').closest('button')!;
    expect(first.className).toMatch(/bg-blue-100/);
  });

  it('highlights the last chapter when currentTime is past the end', () => {
    render(<ChapterSidebar chapters={SAMPLE_CHAPTERS} onSeek={() => {}} currentTime={99999} />);

    const last = screen.getByText('Summary').closest('button')!;
    expect(last.className).toMatch(/bg-blue-100/);
  });

  it('triggers scrollIntoView on the active chapter after render', () => {
    render(<ChapterSidebar chapters={SAMPLE_CHAPTERS} onSeek={() => {}} currentTime={200} />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
