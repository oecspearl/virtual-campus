'use client';

import React from 'react';
import Image from 'next/image';
import { stripHtml } from '@/lib/utils';
import { formatModality } from '@/app/components/course/helpers';

interface CourseHeroProps {
  course: {
    title: string;
    description: string | null;
    thumbnail: string | null;
    modality: string;
    difficulty: string;
    estimated_duration: string | null;
  };
  lessonCount: number;
  sourceTenantName?: string | null;
  instructorNames?: string[];
  sectionName?: string | null;
}

function CourseHeroInner({ course, lessonCount, sourceTenantName, sectionName }: CourseHeroProps) {
  const desc = stripHtml(course.description || '');

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Accent shapes */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.06] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-emerald-400/[0.04] translate-y-1/2 -translate-x-1/3" />

      <div className="relative px-6 sm:px-10 lg:px-12 py-8 lg:py-10">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-10">
          {/* Thumbnail */}
          <div className="shrink-0 order-1 lg:order-2">
            {course.thumbnail ? (
              <Image src={course.thumbnail} alt="" className="w-full sm:w-48 lg:w-44 h-28 lg:h-28 rounded-lg object-cover ring-1 ring-white/10" width={176} height={112} unoptimized />
            ) : (
              <div className="w-full sm:w-48 lg:w-44 h-28 lg:h-28 rounded-lg bg-white/[0.06] ring-1 ring-white/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
          </div>

          {/* Text */}
          <div className="flex-1 order-2 lg:order-1 min-w-0">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {sectionName && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/20">
                  Section: {sectionName}
                </span>
              )}
              {sourceTenantName && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">Shared from {sourceTenantName}</span>
              )}
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                {formatModality(course.modality)}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10 capitalize">
                {course.difficulty || 'All Levels'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-[28px] font-bold text-white leading-snug mb-2 tracking-tight">
              {course.title}
            </h1>

            {desc && (
              <p className="text-sm text-white/60 leading-relaxed mb-4 max-w-2xl line-clamp-2">{desc}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-white/50">
              <span>{lessonCount} lessons</span>
              <span>{course.estimated_duration || 'Flexible'}</span>
              <span>Certificate included</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CourseHero = React.memo(CourseHeroInner);
export default CourseHero;
