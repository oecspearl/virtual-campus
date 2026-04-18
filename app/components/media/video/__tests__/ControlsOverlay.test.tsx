// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ControlsOverlay from '../ControlsOverlay';
import type { VideoCaption } from '../CaptionMenu';

/**
 * Build a ControlsOverlay props object with sensible defaults, overridable
 * per test. Returns both the props and a dict of every mocked callback
 * so tests can assert on them.
 */
function makeProps(overrides: Partial<React.ComponentProps<typeof ControlsOverlay>> = {}) {
  const callbacks = {
    togglePlay: vi.fn(),
    toggleMute: vi.fn(),
    toggleFullscreen: vi.fn(),
    seekTo: vi.fn(),
    changeSpeed: vi.fn(),
    toggleCaption: vi.fn(),
    onVolumeChange: vi.fn(),
    onToggleAd: vi.fn(),
    onTimestampBookmark: vi.fn(),
    setShowSpeedMenu: vi.fn(),
    setShowCaptionMenu: vi.fn(),
  };

  const props: React.ComponentProps<typeof ControlsOverlay> = {
    isPlaying: false,
    isMuted: false,
    isFullscreen: false,
    currentTime: 30,
    duration: 180,
    volume: 0.8,
    playbackRate: 1,
    captions: [],
    activeCaptionIdx: null,
    audioDescriptionSrc: undefined,
    adEnabled: false,
    ...callbacks,
    showSpeedMenu: false,
    showCaptionMenu: false,
    speedMenuRef: { current: null },
    captionMenuRef: { current: null },
    ...overrides,
  };

  return { props, callbacks };
}

describe('ControlsOverlay — play/pause', () => {
  it('shows "Play" label when paused', () => {
    const { props } = makeProps({ isPlaying: false });
    render(<ControlsOverlay {...props} />);
    expect(screen.getByRole('button', { name: /Play \(k\)/ })).toBeInTheDocument();
  });

  it('shows "Pause" label when playing', () => {
    const { props } = makeProps({ isPlaying: true });
    render(<ControlsOverlay {...props} />);
    expect(screen.getByRole('button', { name: /Pause \(k\)/ })).toBeInTheDocument();
  });

  it('calls togglePlay when clicked', async () => {
    const user = userEvent.setup();
    const { props, callbacks } = makeProps();
    render(<ControlsOverlay {...props} />);
    await user.click(screen.getByRole('button', { name: /Play \(k\)/ }));
    expect(callbacks.togglePlay).toHaveBeenCalledTimes(1);
  });
});

describe('ControlsOverlay — skip buttons', () => {
  it('seeks back 5 seconds clamped at 0', async () => {
    const user = userEvent.setup();
    const { props, callbacks } = makeProps({ currentTime: 3 });
    render(<ControlsOverlay {...props} />);
    await user.click(screen.getByRole('button', { name: 'Back 5 seconds' }));
    expect(callbacks.seekTo).toHaveBeenCalledWith(0);
  });

  it('seeks forward 5 seconds clamped at duration', async () => {
    const user = userEvent.setup();
    const { props, callbacks } = makeProps({ currentTime: 178, duration: 180 });
    render(<ControlsOverlay {...props} />);
    await user.click(screen.getByRole('button', { name: 'Forward 5 seconds' }));
    expect(callbacks.seekTo).toHaveBeenCalledWith(180);
  });
});

describe('ControlsOverlay — volume', () => {
  it('renders the volume slider on desktop with current volume', () => {
    const { props } = makeProps({ volume: 0.7 });
    render(<ControlsOverlay {...props} />);
    const slider = screen.getByRole('slider', { name: 'Volume' });
    expect(slider).toHaveValue('0.7');
  });

  it('shows 0 on the slider when muted (regardless of underlying volume)', () => {
    const { props } = makeProps({ volume: 0.7, isMuted: true });
    render(<ControlsOverlay {...props} />);
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('0');
  });

  it('calls onVolumeChange when the slider moves', () => {
    const { props, callbacks } = makeProps();
    render(<ControlsOverlay {...props} />);
    const slider = screen.getByRole('slider', { name: 'Volume' });
    // React wires onChange on <input type="range"> to the input event,
    // so fireEvent.change (which dispatches both) is the correct entry
    // point for triggering the handler.
    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(callbacks.onVolumeChange).toHaveBeenCalled();
  });
});

describe('ControlsOverlay — bookmark', () => {
  it('renders the bookmark button only when onTimestampBookmark is provided', () => {
    const { props: withBookmark } = makeProps();
    const { unmount } = render(<ControlsOverlay {...withBookmark} />);
    expect(screen.getByRole('button', { name: /Bookmark this moment/ })).toBeInTheDocument();
    unmount();

    const { props: withoutBookmark } = makeProps({ onTimestampBookmark: undefined });
    render(<ControlsOverlay {...withoutBookmark} />);
    expect(screen.queryByRole('button', { name: /Bookmark this moment/ })).not.toBeInTheDocument();
  });

  it('calls onTimestampBookmark with the current time', async () => {
    const user = userEvent.setup();
    const { props, callbacks } = makeProps({ currentTime: 137 });
    render(<ControlsOverlay {...props} />);
    await user.click(screen.getByRole('button', { name: /Bookmark this moment/ }));
    expect(callbacks.onTimestampBookmark).toHaveBeenCalledWith(137);
  });
});

describe('ControlsOverlay — audio description toggle', () => {
  it('does not render the AD button when no audio description source', () => {
    const { props } = makeProps();
    render(<ControlsOverlay {...props} />);
    expect(
      screen.queryByRole('button', { name: /Enable audio descriptions/ })
    ).not.toBeInTheDocument();
  });

  it('renders the AD button when audioDescriptionSrc is set', () => {
    const { props } = makeProps({ audioDescriptionSrc: 'https://example.com/ad.mp3' });
    render(<ControlsOverlay {...props} />);
    expect(screen.getByRole('button', { name: /Enable audio descriptions/ })).toBeInTheDocument();
  });

  it('shows the "Disable" label when AD is already enabled', () => {
    const { props } = makeProps({
      audioDescriptionSrc: 'https://example.com/ad.mp3',
      adEnabled: true,
    });
    render(<ControlsOverlay {...props} />);
    expect(screen.getByRole('button', { name: /Disable audio descriptions/ })).toBeInTheDocument();
  });

  it('calls onToggleAd when the AD button is clicked', async () => {
    const user = userEvent.setup();
    const { props, callbacks } = makeProps({ audioDescriptionSrc: 'x' });
    render(<ControlsOverlay {...props} />);
    await user.click(screen.getByRole('button', { name: /Enable audio descriptions/ }));
    expect(callbacks.onToggleAd).toHaveBeenCalled();
  });
});

describe('ControlsOverlay — fullscreen', () => {
  it('shows the "Fullscreen (f)" label when not fullscreen', () => {
    const { props } = makeProps({ isFullscreen: false });
    render(<ControlsOverlay {...props} />);
    expect(screen.getByRole('button', { name: /Fullscreen \(f\)/ })).toBeInTheDocument();
  });

  it('shows "Exit fullscreen" when in fullscreen', () => {
    const { props } = makeProps({ isFullscreen: true });
    render(<ControlsOverlay {...props} />);
    expect(screen.getByRole('button', { name: /Exit fullscreen \(f\)/ })).toBeInTheDocument();
  });

  it('calls toggleFullscreen when clicked', async () => {
    const user = userEvent.setup();
    const { props, callbacks } = makeProps();
    render(<ControlsOverlay {...props} />);
    await user.click(screen.getByRole('button', { name: /Fullscreen \(f\)/ }));
    expect(callbacks.toggleFullscreen).toHaveBeenCalled();
  });
});

describe('ControlsOverlay — speed / caption menu toggle behaviour', () => {
  it('opening the speed menu closes the caption menu', async () => {
    const user = userEvent.setup();
    const { props, callbacks } = makeProps();
    render(<ControlsOverlay {...props} />);
    await user.click(screen.getByRole('button', { name: /Playback speed/ }));
    expect(callbacks.setShowSpeedMenu).toHaveBeenCalledWith(true);
    expect(callbacks.setShowCaptionMenu).toHaveBeenCalledWith(false);
  });

  it('opening the caption menu closes the speed menu', async () => {
    const user = userEvent.setup();
    const captions: VideoCaption[] = [{ src: 'en.vtt', srclang: 'en', label: 'English' }];
    const { props, callbacks } = makeProps({ captions });
    render(<ControlsOverlay {...props} />);
    await user.click(screen.getByRole('button', { name: /Captions/ }));
    expect(callbacks.setShowCaptionMenu).toHaveBeenCalledWith(true);
    expect(callbacks.setShowSpeedMenu).toHaveBeenCalledWith(false);
  });
});
