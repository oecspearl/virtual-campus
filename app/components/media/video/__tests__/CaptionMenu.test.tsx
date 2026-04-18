// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CaptionMenu, { type VideoCaption } from '../CaptionMenu';

const SAMPLE: VideoCaption[] = [
  { src: 'en.vtt', srclang: 'en', label: 'English' },
  { src: 'es.vtt', srclang: 'es', label: 'Spanish' },
];

describe('CaptionMenu — trigger', () => {
  it('always renders the trigger even with no captions', () => {
    render(
      <CaptionMenu
        captions={[]}
        activeCaptionIdx={null}
        onToggleCaption={() => {}}
        open={false}
        onToggle={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /Captions/ })).toBeInTheDocument();
  });

  it('dims the trigger when no captions are available', () => {
    render(
      <CaptionMenu
        captions={[]}
        activeCaptionIdx={null}
        onToggleCaption={() => {}}
        open={false}
        onToggle={() => {}}
      />
    );
    const trigger = screen.getByRole('button', { name: /Captions/ });
    expect(trigger.className).toMatch(/text-white\/30/);
  });

  it('highlights the trigger when a caption is active', () => {
    render(
      <CaptionMenu
        captions={SAMPLE}
        activeCaptionIdx={0}
        onToggleCaption={() => {}}
        open={false}
        onToggle={() => {}}
      />
    );
    const trigger = screen.getByRole('button', { name: /Captions/ });
    expect(trigger.className).toMatch(/text-blue-300/);
  });

  it('calls onToggle when the trigger is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <CaptionMenu
        captions={SAMPLE}
        activeCaptionIdx={null}
        onToggleCaption={() => {}}
        open={false}
        onToggle={onToggle}
      />
    );
    await user.click(screen.getByRole('button', { name: /Captions/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('CaptionMenu — dropdown with captions', () => {
  it('renders an Off option and one button per caption track', () => {
    render(
      <CaptionMenu
        captions={SAMPLE}
        activeCaptionIdx={null}
        onToggleCaption={() => {}}
        open={true}
        onToggle={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spanish' })).toBeInTheDocument();
  });

  it('calls onToggleCaption with null when Off is clicked', async () => {
    const user = userEvent.setup();
    const onToggleCaption = vi.fn();
    render(
      <CaptionMenu
        captions={SAMPLE}
        activeCaptionIdx={0}
        onToggleCaption={onToggleCaption}
        open={true}
        onToggle={() => {}}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Off' }));
    expect(onToggleCaption).toHaveBeenCalledWith(null);
  });

  it('calls onToggleCaption with the track index when a language is picked', async () => {
    const user = userEvent.setup();
    const onToggleCaption = vi.fn();
    render(
      <CaptionMenu
        captions={SAMPLE}
        activeCaptionIdx={null}
        onToggleCaption={onToggleCaption}
        open={true}
        onToggle={() => {}}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Spanish' }));
    expect(onToggleCaption).toHaveBeenCalledWith(1);
  });

  it('marks Off as active when no caption is selected', () => {
    render(
      <CaptionMenu
        captions={SAMPLE}
        activeCaptionIdx={null}
        onToggleCaption={() => {}}
        open={true}
        onToggle={() => {}}
      />
    );
    const off = screen.getByRole('button', { name: 'Off' });
    expect(off.className).toMatch(/text-blue-300/);
  });

  it('marks the active track as selected', () => {
    render(
      <CaptionMenu
        captions={SAMPLE}
        activeCaptionIdx={1}
        onToggleCaption={() => {}}
        open={true}
        onToggle={() => {}}
      />
    );
    const spanish = screen.getByRole('button', { name: 'Spanish' });
    expect(spanish.className).toMatch(/text-blue-300/);
    const english = screen.getByRole('button', { name: 'English' });
    expect(english.className).not.toMatch(/text-blue-300/);
  });
});

describe('CaptionMenu — dropdown with no captions', () => {
  it('renders an empty-state message instead of options', () => {
    render(
      <CaptionMenu
        captions={[]}
        activeCaptionIdx={null}
        onToggleCaption={() => {}}
        open={true}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText(/No captions available/)).toBeInTheDocument();
    // Only the trigger button should be present — no Off or track buttons.
    expect(screen.queryByRole('button', { name: 'Off' })).not.toBeInTheDocument();
  });
});
