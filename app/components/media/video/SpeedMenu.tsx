'use client';

import React from 'react';

export const SPEED_OPTIONS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface SpeedMenuProps {
  /** Current playback rate. */
  playbackRate: number;
  /** Called when the user picks a new speed. */
  onChangeSpeed: (speed: number) => void;
  /** Whether the dropdown is expanded. */
  open: boolean;
  /** Called to toggle the dropdown open/closed. */
  onToggle: () => void;
  /** Available speed options. Defaults to the standard set. */
  options?: readonly number[];
}

/**
 * Playback-speed dropdown used in VideoPlayer controls. The trigger button
 * shows the current rate (e.g. `1.25x`) and highlights when the speed is
 * not the default. Opening a second dropdown is the parent's concern — this
 * component only reports toggle clicks and speed selections.
 */
const SpeedMenu = React.forwardRef<HTMLDivElement, SpeedMenuProps>(function SpeedMenu(
  { playbackRate, onChangeSpeed, open, onToggle, options = SPEED_OPTIONS },
  ref
) {
  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={onToggle}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          playbackRate !== 1 ? 'text-blue-300 bg-white/10' : 'text-white/70 hover:text-white'
        }`}
        aria-label={`Playback speed: ${playbackRate}x`}
      >
        {playbackRate}x
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur rounded-lg shadow-lg py-1 min-w-[80px] z-10">
          {options.map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                s === playbackRate
                  ? 'text-blue-300 bg-white/10'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default SpeedMenu;
