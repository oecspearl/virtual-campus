'use client';

import React from 'react';
import { Check, Square } from 'lucide-react';

interface ContentProgressCheckboxProps {
  /** Whether this content item is marked complete. */
  isComplete: boolean;
  /** Called when the user clicks the checkbox. */
  onToggle: () => void;
}

/**
 * Small completion-state toggle used in every content-block header.
 * Stops click propagation so clicking the checkbox doesn't also trigger
 * the surrounding collapse-toggle header.
 */
export default function ContentProgressCheckbox({
  isComplete,
  onToggle,
}: ContentProgressCheckboxProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`p-1 rounded transition-colors ${
        isComplete
          ? 'text-teal-400 hover:text-teal-300'
          : 'text-white/30 hover:text-white/60'
      }`}
      title={isComplete ? 'Mark as incomplete' : 'Mark as complete'}
      aria-label={isComplete ? 'Mark as incomplete' : 'Mark as complete'}
    >
      {isComplete ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
    </button>
  );
}
