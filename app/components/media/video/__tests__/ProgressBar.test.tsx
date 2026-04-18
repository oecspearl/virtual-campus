// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressBar from '../ProgressBar';
import { type VideoChapter } from '../ChapterSidebar';

const CHAPTERS: VideoChapter[] = [
  { time: 0, title: 'Intro' },
  { time: 60, title: 'Middle' },
  { time: 120, title: 'End' },
];

describe('ProgressBar — accessibility', () => {
  it('renders a slider role with correct aria bounds', () => {
    render(
      <ProgressBar
        currentTime={30}
        duration={180}
        bufferedPct={50}
        progressPct={16}
        watchedPct={0}
        chapters={[]}
        onScrub={() => {}}
      />
    );
    const slider = screen.getByRole('slider', { name: /Video progress/ });
    expect(slider).toHaveAttribute('aria-valuenow', '30');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '180');
  });
});

describe('ProgressBar — readout', () => {
  it('shows current and total time formatted', () => {
    render(
      <ProgressBar
        currentTime={65}
        duration={180}
        bufferedPct={0}
        progressPct={0}
        watchedPct={0}
        chapters={[]}
        onScrub={() => {}}
      />
    );
    // "1:05 / 3:00"
    expect(screen.getByText('1:05 / 3:00')).toBeInTheDocument();
  });

  it('shows the active chapter title based on currentTime', () => {
    render(
      <ProgressBar
        currentTime={90}
        duration={180}
        bufferedPct={0}
        progressPct={0}
        watchedPct={0}
        chapters={CHAPTERS}
        onScrub={() => {}}
      />
    );
    // currentTime = 90 → active chapter is "Middle" (at 60s)
    expect(screen.getByText('Middle')).toBeInTheDocument();
  });

  it('shows the first chapter when currentTime is before any chapter', () => {
    render(
      <ProgressBar
        currentTime={-1}
        duration={180}
        bufferedPct={0}
        progressPct={0}
        watchedPct={0}
        chapters={CHAPTERS}
        onScrub={() => {}}
      />
    );
    expect(screen.getByText('Intro')).toBeInTheDocument();
  });

  it('does not show a chapter title when chapters is empty', () => {
    render(
      <ProgressBar
        currentTime={30}
        duration={180}
        bufferedPct={0}
        progressPct={0}
        watchedPct={0}
        chapters={[]}
        onScrub={() => {}}
      />
    );
    expect(screen.queryByText(/Intro|Middle|End/)).not.toBeInTheDocument();
  });
});

describe('ProgressBar — watched percentage badge', () => {
  it('shows "X% watched" when watchedPct is between 0 and 100', () => {
    render(
      <ProgressBar
        currentTime={0}
        duration={180}
        bufferedPct={0}
        progressPct={0}
        watchedPct={42}
        chapters={[]}
        onScrub={() => {}}
      />
    );
    expect(screen.getByText(/42% watched/)).toBeInTheDocument();
  });

  it('hides the watched badge at 0%', () => {
    render(
      <ProgressBar
        currentTime={0}
        duration={180}
        bufferedPct={0}
        progressPct={0}
        watchedPct={0}
        chapters={[]}
        onScrub={() => {}}
      />
    );
    expect(screen.queryByText(/watched/)).not.toBeInTheDocument();
  });

  it('hides the watched badge at 100%', () => {
    render(
      <ProgressBar
        currentTime={0}
        duration={180}
        bufferedPct={0}
        progressPct={0}
        watchedPct={100}
        chapters={[]}
        onScrub={() => {}}
      />
    );
    expect(screen.queryByText(/watched/)).not.toBeInTheDocument();
  });
});

describe('ProgressBar — chapter markers', () => {
  it('renders one marker per chapter', () => {
    const { container } = render(
      <ProgressBar
        currentTime={0}
        duration={180}
        bufferedPct={0}
        progressPct={0}
        watchedPct={0}
        chapters={CHAPTERS}
        onScrub={() => {}}
      />
    );
    // Marker divs have a unique `title` attribute matching the chapter
    expect(container.querySelector('[title="Intro"]')).toBeInTheDocument();
    expect(container.querySelector('[title="Middle"]')).toBeInTheDocument();
    expect(container.querySelector('[title="End"]')).toBeInTheDocument();
  });
});

describe('ProgressBar — scrub click', () => {
  it('does NOT call onScrub when duration is 0', async () => {
    const user = userEvent.setup();
    const onScrub = vi.fn();
    render(
      <ProgressBar
        currentTime={0}
        duration={0}
        bufferedPct={0}
        progressPct={0}
        watchedPct={0}
        chapters={[]}
        onScrub={onScrub}
      />
    );
    await user.click(screen.getByRole('slider'));
    expect(onScrub).not.toHaveBeenCalled();
  });

  it('calls onScrub with a fraction in [0, 1] when the bar is clicked', async () => {
    const user = userEvent.setup();
    const onScrub = vi.fn();
    render(
      <ProgressBar
        currentTime={0}
        duration={180}
        bufferedPct={0}
        progressPct={0}
        watchedPct={0}
        chapters={[]}
        onScrub={onScrub}
      />
    );
    // userEvent.click fires at the centre of the target — jsdom returns
    // zero-size rects, so the handler short-circuits. Fire a raw click
    // event with synthetic coordinates to exercise the fraction math.
    const slider = screen.getByRole('slider');
    slider.getBoundingClientRect = () =>
      ({ left: 0, width: 400, top: 0, right: 400, bottom: 10, height: 10, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    await user.pointer({ target: slider, coords: { clientX: 100 } });
    await user.click(slider);
    // Not asserting exact fraction because userEvent synthesizes coords
    // differently, but we can at least verify it was called.
    expect(onScrub).toHaveBeenCalled();
    const [fraction] = onScrub.mock.calls[0];
    expect(fraction).toBeGreaterThanOrEqual(0);
    expect(fraction).toBeLessThanOrEqual(1);
  });
});
