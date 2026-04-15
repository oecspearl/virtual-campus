'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const CARD_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // orange
];

function getCardColor(courseId: string): string {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

interface CourseCardProps {
  courseId: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  progress: number;
  sectionName?: string | null;
}

export default function CourseCard({ courseId, title, description, thumbnail, progress, sectionName }: CourseCardProps) {
  const color = getCardColor(courseId);
  const initial = title.charAt(0).toUpperCase();
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger progress bar animation after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Link
      href={`/course/${courseId}`}
      className="group block rounded-lg border border-gray-200/80 overflow-hidden transition-all duration-300"
      style={{
        /* Quick Win 5: Tinted card background */
        backgroundColor: `color-mix(in srgb, ${color} 3%, white)`,
        /* Quick Win 3: Colored hover shadow via CSS custom property */
        ['--card-color' as string]: color,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 8px 30px color-mix(in srgb, ${color} 18%, transparent)`;
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${color} 25%, #d1d5db)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderColor = '';
      }}
    >
      {/* Color bar */}
      <div className="h-1" style={{ backgroundColor: color }} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Thumbnail or initial */}
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {initial}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-800 text-sm leading-tight line-clamp-2 group-hover:text-slate-900 transition-colors">
              {title}
            </h3>
            {sectionName && (
              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded border border-indigo-100">
                {sectionName}
              </span>
            )}
            {description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                {description.replace(/<[^>]*>/g, '').substring(0, 80)}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-semibold text-gray-700">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            {/* Quick Win 4: Animated progress bar fill */}
            <div
              ref={barRef}
              className="h-full rounded-full"
              style={{
                width: mounted ? `${Math.min(progress, 100)}%` : '0%',
                backgroundColor: progress >= 100 ? '#10B981' : color,
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
