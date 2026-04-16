'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const CARD_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
];

function getCardColor(courseId: string): string {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

interface CourseListItemProps {
  courseId: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  progress: number;
  sectionName?: string | null;
}

export default function CourseListItem({ courseId, title, description, thumbnail, progress, sectionName }: CourseListItemProps) {
  const color = getCardColor(courseId);
  const initial = title.charAt(0).toUpperCase();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Link
      href={`/course/${courseId}`}
      className="group flex items-center gap-4 p-3 rounded-lg border border-gray-200/80 transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 2%, white)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${color} 25%, #d1d5db)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '';
      }}
    >
      {/* Thumbnail or initial */}
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-base font-bold flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {initial}
        </div>
      )}

      {/* Title + section */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-800 text-sm leading-tight truncate group-hover:text-slate-900 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          {sectionName && (
            <span className="inline-flex items-center px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded border border-indigo-100">
              {sectionName}
            </span>
          )}
          {description && (
            <p className="text-xs text-gray-400 truncate">
              {description.replace(/<[^>]*>/g, '').substring(0, 60)}
            </p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-24 hidden sm:block">
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: mounted ? `${Math.min(progress, 100)}%` : '0%',
                backgroundColor: progress >= 100 ? '#10B981' : color,
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
        <span className="text-xs font-semibold text-gray-600 w-8 text-right">{Math.round(progress)}%</span>
      </div>
    </Link>
  );
}
