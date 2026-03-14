'use client';

import { Icon } from '@iconify/react';
import { formatModality, getModalityIcon } from '@/app/components/course/helpers';
import { stripHtml } from '@/lib/utils';

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
}

export default function CourseHero({
  course,
  lessonCount,
  sourceTenantName,
  instructorNames,
}: CourseHeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800">
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-800/90"></div>
      <div className="relative mx-auto max-w-8xl px-4 py-8 sm:py-12 lg:py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">
          <div className="flex-1 order-2 lg:order-1">
            {/* Source tenant badge */}
            {sourceTenantName && (
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-xs rounded-full border border-white/20">
                  <Icon icon="mdi:domain" className="w-3.5 h-3.5" />
                  Shared from {sourceTenantName}
                </span>
              </div>
            )}

            {/* Modality / difficulty / duration badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base">{getModalityIcon(course.modality)}</span>
                <span className="text-xs sm:text-sm font-medium text-blue-100">{formatModality(course.modality)}</span>
              </div>
              <div className="w-px h-3 sm:h-4 bg-blue-300"></div>
              <span className="text-xs sm:text-sm text-blue-200 capitalize">{course.difficulty || 'All Levels'}</span>
              {course.estimated_duration && (
                <>
                  <div className="w-px h-3 sm:h-4 bg-blue-300"></div>
                  <span className="text-xs sm:text-sm text-blue-200">{course.estimated_duration}</span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              {course.title}
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-blue-100 mb-6 sm:mb-8 leading-relaxed max-w-3xl">
              {stripHtml(course.description || '')}
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Lessons count */}
              <div className="flex items-center gap-2 text-blue-100">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span className="text-xs sm:text-sm font-medium">{lessonCount} Lessons</span>
              </div>
              {/* Duration */}
              <div className="flex items-center gap-2 text-blue-100">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs sm:text-sm font-medium">{course.estimated_duration || 'Flexible'}</span>
              </div>
              {/* Instructor names */}
              {instructorNames && instructorNames.length > 0 && (
                <div className="flex items-center gap-2 text-blue-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium">{instructorNames.join(', ')}</span>
                </div>
              )}
              {/* Certificate badge (shown when no instructor names) */}
              {!instructorNames?.length && (
                <div className="flex items-center gap-2 text-blue-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium">Certificate Included</span>
                </div>
              )}
            </div>
          </div>

          {/* Course Thumbnail */}
          <div className="w-full sm:w-80 lg:w-80 lg:flex-shrink-0 order-1 lg:order-2">
            {course.thumbnail ? (
              <div className="relative">
                <img
                  src={course.thumbnail}
                  alt="Course thumbnail"
                  className="w-full h-48 sm:h-64 lg:h-80 rounded-xl sm:rounded-2xl object-cover shadow-2xl ring-2 sm:ring-4 ring-white/20"
                />
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            ) : (
              <div className="w-full h-48 sm:h-64 lg:h-80 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <div className="text-center text-white">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-xs sm:text-sm font-medium">Course Preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
