'use client';

import React from 'react';

type LoadingVariant = 'books' | 'pencil' | 'dots' | 'pulse' | 'blocks';
type LoadingSize = 'xs' | 'sm' | 'md' | 'lg';

interface LoadingIndicatorProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  text?: string;
  className?: string;
  /** Whether to center in a full container */
  fullCenter?: boolean;
}

const sizeMap = {
  xs: { container: 'gap-2', icon: 'scale-[0.5]', text: 'text-xs' },
  sm: { container: 'gap-2.5', icon: 'scale-[0.7]', text: 'text-xs' },
  md: { container: 'gap-3', icon: 'scale-100', text: 'text-sm' },
  lg: { container: 'gap-4', icon: 'scale-[1.3]', text: 'text-sm' },
};

export default function LoadingIndicator({
  variant = 'books',
  size = 'md',
  text,
  className = '',
  fullCenter = false,
}: LoadingIndicatorProps) {
  const s = sizeMap[size];

  return (
    <div
      className={`flex flex-col items-center justify-center ${s.container} ${
        fullCenter ? 'min-h-[60vh]' : ''
      } ${className}`}
    >
      <div className={`${s.icon} origin-center`}>
        {variant === 'books' && <BooksAnimation />}
        {variant === 'pencil' && <PencilAnimation />}
        {variant === 'dots' && <DotsAnimation />}
        {variant === 'pulse' && <PulseAnimation />}
        {variant === 'blocks' && <BlocksAnimation />}
      </div>
      {text && (
        <p className={`${s.text} text-gray-400 font-medium animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
}

/** Three stacked books with a page-flip shimmer */
function BooksAnimation() {
  return (
    <div className="relative w-12 h-12">
      <style jsx>{`
        @keyframes bookBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(-2deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-3px) rotate(1deg); }
        }
        @keyframes pageFlip {
          0%, 100% { transform: scaleX(1); opacity: 0.7; }
          50% { transform: scaleX(0.3); opacity: 1; }
        }
        .book-1 { animation: bookBounce 1.8s ease-in-out infinite; }
        .book-2 { animation: bookBounce 1.8s ease-in-out 0.2s infinite; }
        .book-3 { animation: bookBounce 1.8s ease-in-out 0.4s infinite; }
        .page-flip { animation: pageFlip 1.2s ease-in-out infinite; transform-origin: left; }
      `}</style>
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Book 1 - bottom */}
        <g className="book-1">
          <rect x="8" y="30" width="32" height="6" rx="1.5" fill="#6366f1" opacity="0.9" />
          <rect x="10" y="31" width="4" height="4" rx="0.5" fill="#818cf8" />
        </g>
        {/* Book 2 - middle */}
        <g className="book-2">
          <rect x="6" y="22" width="36" height="6" rx="1.5" fill="#8b5cf6" opacity="0.9" />
          <rect className="page-flip" x="8" y="23" width="6" height="4" rx="0.5" fill="#a78bfa" />
        </g>
        {/* Book 3 - top */}
        <g className="book-3">
          <rect x="10" y="14" width="28" height="6" rx="1.5" fill="#3b82f6" opacity="0.9" />
          <rect x="12" y="15" width="4" height="4" rx="0.5" fill="#60a5fa" />
        </g>
        {/* Sparkle particles */}
        <circle cx="40" cy="16" r="1.2" fill="#fbbf24" opacity="0.8">
          <animate attributeName="opacity" values="0;0.8;0" dur="2s" repeatCount="indefinite" />
          <animate attributeName="cy" values="16;10;16" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="36" cy="12" r="0.8" fill="#f59e0b" opacity="0.6">
          <animate attributeName="opacity" values="0;0.6;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
          <animate attributeName="cy" values="12;7;12" dur="2s" begin="0.5s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

/** A pencil that writes across with a trail */
function PencilAnimation() {
  return (
    <div className="relative w-14 h-10">
      <style jsx>{`
        @keyframes pencilWrite {
          0% { transform: translateX(-4px) rotate(-3deg); }
          50% { transform: translateX(16px) rotate(2deg); }
          100% { transform: translateX(-4px) rotate(-3deg); }
        }
        @keyframes lineGrow {
          0% { width: 0; opacity: 0; }
          30% { opacity: 1; }
          50% { width: 100%; opacity: 1; }
          70% { opacity: 1; }
          100% { width: 0; opacity: 0; }
        }
        .pencil-move { animation: pencilWrite 2s ease-in-out infinite; }
        .write-line { animation: lineGrow 2s ease-in-out infinite; }
        .write-line-2 { animation: lineGrow 2s ease-in-out 0.3s infinite; }
        .write-line-3 { animation: lineGrow 2s ease-in-out 0.6s infinite; }
      `}</style>
      <svg viewBox="0 0 56 40" className="w-14 h-10">
        {/* Writing lines */}
        <rect className="write-line" x="8" y="28" height="1.5" rx="0.75" fill="#c7d2fe" />
        <rect className="write-line-2" x="8" y="32" height="1.5" rx="0.75" fill="#ddd6fe" />
        <rect className="write-line-3" x="8" y="36" height="1.5" rx="0.75" fill="#e0e7ff" />
        {/* Pencil */}
        <g className="pencil-move">
          <rect x="12" y="6" width="28" height="7" rx="1.5" fill="#f59e0b" transform="rotate(25, 26, 9)" />
          <polygon points="9,22 12,17 14,20" fill="#fbbf24" />
          <polygon points="9,22 10,20 11,21" fill="#374151" />
          <rect x="35" y="3" width="6" height="7" rx="1" fill="#fca5a5" transform="rotate(25, 38, 6)" />
        </g>
      </svg>
    </div>
  );
}

/** Bouncing gradient dots */
function DotsAnimation() {
  return (
    <div className="flex items-center gap-1.5">
      <style jsx>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-10px) scale(1.15); }
        }
      `}</style>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: ['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4'][i],
            animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** Pulsing graduation cap / academic icon */
function PulseAnimation() {
  return (
    <div className="relative w-12 h-12">
      <style jsx>{`
        @keyframes capFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ringPulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
      `}</style>
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Pulse rings */}
        <circle cx="24" cy="24" r="16" fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.2">
          <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="24" cy="24" r="12" fill="none" stroke="#8b5cf6" strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="10;18;10" dur="2s" begin="0.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" begin="0.4s" repeatCount="indefinite" />
        </circle>
        {/* Graduation cap */}
        <g style={{ animation: 'capFloat 2s ease-in-out infinite' }}>
          <polygon points="24,14 8,22 24,30 40,22" fill="#6366f1" />
          <rect x="22" y="22" width="4" height="10" fill="#4f46e5" />
          <line x1="38" y1="22" x2="38" y2="34" stroke="#8b5cf6" strokeWidth="1.5" />
          <circle cx="38" cy="35" r="1.5" fill="#a78bfa" />
        </g>
      </svg>
    </div>
  );
}

/** Morphing knowledge blocks / building blocks */
function BlocksAnimation() {
  return (
    <div className="relative w-12 h-12">
      <style jsx>{`
        @keyframes blockStack {
          0%, 100% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-3px) scale(1.05); opacity: 0.85; }
        }
      `}</style>
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <rect x="6" y="30" width="14" height="12" rx="2.5" fill="#6366f1" opacity="0.9">
          <animate attributeName="y" values="30;27;30" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <rect x="22" y="26" width="14" height="16" rx="2.5" fill="#3b82f6" opacity="0.9">
          <animate attributeName="y" values="26;23;26" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
        </rect>
        <rect x="14" y="16" width="14" height="14" rx="2.5" fill="#8b5cf6" opacity="0.9">
          <animate attributeName="y" values="16;13;16" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
        </rect>
        <rect x="30" y="12" width="12" height="14" rx="2.5" fill="#06b6d4" opacity="0.85">
          <animate attributeName="y" values="12;9;12" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
        </rect>
        {/* Sparkle */}
        <circle cx="42" cy="10" r="1" fill="#fbbf24">
          <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

/** Inline-friendly tiny loader — use instead of small spinners in buttons */
export function InlineLoader({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-current"
          style={{
            animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </span>
  );
}
