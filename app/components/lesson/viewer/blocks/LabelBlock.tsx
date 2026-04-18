'use client';

import React from 'react';

export type LabelStyle = 'heading' | 'section' | 'divider' | 'banner';
export type LabelSize = 'small' | 'medium' | 'large';

export interface LabelBlockProps {
  /** Text to render. Falls back to an empty string. */
  text?: string;
  /** Visual style. Defaults to 'heading'. */
  style?: LabelStyle | string;
  /** Text/padding size. Defaults to 'medium'. */
  size?: LabelSize | string;
}

// Shared padding table — all non-divider variants use these.
const PADDING: Record<string, string> = {
  small: 'py-2 px-4',
  medium: 'py-3 px-5',
  large: 'py-4 px-6',
};

// Per-variant text-size tables.
const DIVIDER_TEXT: Record<string, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
};

const SECTION_TEXT: Record<string, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

const BANNER_TEXT: Record<string, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

const HEADING_TEXT: Record<string, string> = {
  small: 'text-base',
  medium: 'text-lg',
  large: 'text-xl',
};

/**
 * Inline section label used between content blocks. Four visual
 * variants (heading / section / divider / banner) × three sizes.
 * Purely presentational — no interaction, no state, not collapsible.
 */
export default function LabelBlock({
  text = '',
  style = 'heading',
  size = 'medium',
}: LabelBlockProps) {
  const paddingClass = PADDING[size] ?? PADDING.medium;

  if (style === 'divider') {
    const sizeClass = DIVIDER_TEXT[size] ?? DIVIDER_TEXT.medium;
    return (
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-gray-300" />
        {text && (
          <span
            className={`${sizeClass} font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-white px-3`}
          >
            {text}
          </span>
        )}
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-300 to-gray-300" />
      </div>
    );
  }

  if (style === 'section') {
    const sizeClass = SECTION_TEXT[size] ?? SECTION_TEXT.medium;
    return (
      <div className={`${paddingClass} my-5 pl-4 border-l-2 border-slate-300`}>
        <span className={`${sizeClass} font-medium text-slate-700`}>{text}</span>
      </div>
    );
  }

  if (style === 'banner') {
    const sizeClass = BANNER_TEXT[size] ?? BANNER_TEXT.medium;
    return (
      <div className={`${paddingClass} my-5 rounded-md bg-slate-800 text-center`}>
        <span className={`${sizeClass} font-medium text-white`}>{text}</span>
      </div>
    );
  }

  // Default: heading
  const sizeClass = HEADING_TEXT[size] ?? HEADING_TEXT.medium;
  return (
    <div className={`${paddingClass} my-5 pl-4 border-l-2 border-slate-700`}>
      <h3 className={`${sizeClass} font-medium text-slate-800`}>{text}</h3>
    </div>
  );
}
