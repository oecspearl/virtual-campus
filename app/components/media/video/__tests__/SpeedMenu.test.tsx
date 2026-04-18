// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpeedMenu, { SPEED_OPTIONS } from '../SpeedMenu';

describe('SpeedMenu', () => {
  it('shows the current playback rate on the trigger button', () => {
    render(<SpeedMenu playbackRate={1.5} onChangeSpeed={() => {}} open={false} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /Playback speed: 1.5x/ })).toHaveTextContent('1.5x');
  });

  it('highlights the trigger when speed is not default (1x)', () => {
    const { rerender } = render(
      <SpeedMenu playbackRate={1} onChangeSpeed={() => {}} open={false} onToggle={() => {}} />
    );
    let trigger = screen.getByRole('button', { name: /Playback speed/ });
    expect(trigger.className).not.toMatch(/text-blue-300/);

    rerender(<SpeedMenu playbackRate={1.5} onChangeSpeed={() => {}} open={false} onToggle={() => {}} />);
    trigger = screen.getByRole('button', { name: /Playback speed/ });
    expect(trigger.className).toMatch(/text-blue-300/);
  });

  it('renders no dropdown when open is false', () => {
    render(<SpeedMenu playbackRate={1} onChangeSpeed={() => {}} open={false} onToggle={() => {}} />);
    // Only the trigger button is present — no other buttons from the list.
    expect(screen.getAllByRole('button').length).toBe(1);
  });

  it('renders all speed options when open', () => {
    render(<SpeedMenu playbackRate={1} onChangeSpeed={() => {}} open={true} onToggle={() => {}} />);
    for (const speed of SPEED_OPTIONS) {
      expect(screen.getByRole('button', { name: new RegExp(`^${speed}x$`) })).toBeInTheDocument();
    }
  });

  it('marks the currently-selected option as active', () => {
    render(<SpeedMenu playbackRate={1.25} onChangeSpeed={() => {}} open={true} onToggle={() => {}} />);
    const option = screen.getByRole('button', { name: '1.25x' });
    expect(option.className).toMatch(/text-blue-300/);
  });

  it('calls onToggle when the trigger is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SpeedMenu playbackRate={1} onChangeSpeed={() => {}} open={false} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: /Playback speed/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onChangeSpeed with the selected value', async () => {
    const user = userEvent.setup();
    const onChangeSpeed = vi.fn();
    render(<SpeedMenu playbackRate={1} onChangeSpeed={onChangeSpeed} open={true} onToggle={() => {}} />);

    await user.click(screen.getByRole('button', { name: '2x' }));
    expect(onChangeSpeed).toHaveBeenCalledWith(2);
  });

  it('accepts a custom options list', () => {
    render(
      <SpeedMenu
        playbackRate={1}
        onChangeSpeed={() => {}}
        open={true}
        onToggle={() => {}}
        options={[0.5, 1, 3]}
      />
    );
    expect(screen.getByRole('button', { name: '3x' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2x' })).not.toBeInTheDocument();
  });
});
