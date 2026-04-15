'use client';

import React from 'react';

interface Collaborator {
  userId: string;
  name: string;
  color: string;
  pointer: { x: number; y: number } | null;
}

interface CollaboratorCursorsProps {
  collaborators: Collaborator[];
  appState: {
    scrollX?: number;
    scrollY?: number;
    zoom?: { value: number };
  };
}

export default function CollaboratorCursors({ collaborators, appState }: CollaboratorCursorsProps) {
  const zoom = appState.zoom?.value || 1;
  const scrollX = appState.scrollX || 0;
  const scrollY = appState.scrollY || 0;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {collaborators.map((c) => {
        if (!c.pointer) return null;

        // Convert scene coordinates to viewport coordinates
        const x = (c.pointer.x + scrollX) * zoom;
        const y = (c.pointer.y + scrollY) * zoom;

        return (
          <div
            key={c.userId}
            className="absolute transition-all duration-75 ease-linear"
            style={{ left: x, top: y }}
          >
            {/* Cursor arrow */}
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              className="drop-shadow-sm"
            >
              <path
                d="M0.5 0.5L15.5 10.5L8 11.5L5.5 19.5L0.5 0.5Z"
                fill={c.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            {/* Name label */}
            <div
              className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap shadow-sm"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
