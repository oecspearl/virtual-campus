'use client';

import React from 'react';

export interface VideoCaption {
  src: string;
  srclang: string;
  label: string;
  default?: boolean;
}

interface CaptionMenuProps {
  /** Available caption tracks. Can be empty. */
  captions: VideoCaption[];
  /** Index of the active caption (null = captions off). */
  activeCaptionIdx: number | null;
  /** Called when the user picks a track (or null to turn captions off). */
  onToggleCaption: (idx: number | null) => void;
  /** Whether the dropdown is expanded. */
  open: boolean;
  /** Called to toggle the dropdown open/closed. */
  onToggle: () => void;
}

/**
 * Captions dropdown used in VideoPlayer controls. The trigger button is
 * always rendered (even with no captions) so the UI position is stable,
 * but it dims when no captions are available and the dropdown explains
 * that state. When captions exist, users can switch tracks or turn off
 * captions entirely.
 */
const CaptionMenu = React.forwardRef<HTMLDivElement, CaptionMenuProps>(function CaptionMenu(
  { captions, activeCaptionIdx, onToggleCaption, open, onToggle },
  ref
) {
  const hasCaptions = captions.length > 0;

  const triggerColor =
    activeCaptionIdx !== null
      ? 'text-blue-300'
      : hasCaptions
      ? 'text-white/70 hover:text-white'
      : 'text-white/30 hover:text-white/50';

  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={onToggle}
        className={`p-1.5 transition-colors ${triggerColor}`}
        aria-label="Captions (c)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6v-2zm0 4h8v2H6v-2zm10 0h2v2h-2v-2zm-6-4h8v2h-8v-2z" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur rounded-lg shadow-lg py-1 min-w-[140px] z-10">
          {hasCaptions ? (
            <>
              <button
                onClick={() => onToggleCaption(null)}
                className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                  activeCaptionIdx === null
                    ? 'text-blue-300 bg-white/10'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                Off
              </button>
              {captions.map((cap, i) => (
                <button
                  key={i}
                  onClick={() => onToggleCaption(i)}
                  className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                    i === activeCaptionIdx
                      ? 'text-blue-300 bg-white/10'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {cap.label}
                </button>
              ))}
            </>
          ) : (
            <div className="px-3 py-2 text-xs text-white/50">No captions available</div>
          )}
        </div>
      )}
    </div>
  );
});

export default CaptionMenu;
