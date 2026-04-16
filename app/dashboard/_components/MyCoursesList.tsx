'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import CourseCard from './CourseCard';
import CourseListItem from './CourseListItem';
import StaggeredGrid from './StaggeredGrid';

type ViewMode = 'grid' | 'list';

interface Enrollment {
  id: string;
  course_id: string;
  progress_percentage?: number;
  courses?: {
    title?: string;
    description?: string | null;
    thumbnail?: string | null;
  };
  classes?: {
    name?: string;
  };
}

export default function MyCoursesList({ enrollments }: { enrollments: Enrollment[] }) {
  const [view, setView] = useState<ViewMode>('grid');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">My Courses</h2>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                view === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label="Grid view"
              title="Grid view"
            >
              <Icon icon="mdi:view-grid" className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                view === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label="List view"
              title="List view"
            >
              <Icon icon="mdi:view-list" className="w-4 h-4" />
            </button>
          </div>
          <Link
            href="/my-courses"
            className="text-sm font-medium flex items-center gap-1"
            style={{ color: 'var(--theme-primary)' }}
          >
            View All
            <Icon icon="mdi:chevron-right" className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200/80 p-8 text-center">
          <Icon icon="mdi:book-open-variant" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No courses yet</h3>
          <p className="text-sm text-gray-500 mb-4">Browse available courses to get started</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))' }}
          >
            <Icon icon="mdi:magnify" className="w-4 h-4" />
            Browse Courses
          </Link>
        </div>
      ) : view === 'grid' ? (
        <StaggeredGrid className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrollments.map((enrollment) => (
            <CourseCard
              key={enrollment.id}
              courseId={enrollment.course_id}
              title={enrollment.courses?.title || 'Untitled Course'}
              description={enrollment.courses?.description}
              thumbnail={enrollment.courses?.thumbnail}
              progress={enrollment.progress_percentage || 0}
              sectionName={enrollment.classes?.name || null}
            />
          ))}
        </StaggeredGrid>
      ) : (
        <StaggeredGrid className="flex flex-col gap-2">
          {enrollments.map((enrollment) => (
            <CourseListItem
              key={enrollment.id}
              courseId={enrollment.course_id}
              title={enrollment.courses?.title || 'Untitled Course'}
              description={enrollment.courses?.description}
              thumbnail={enrollment.courses?.thumbnail}
              progress={enrollment.progress_percentage || 0}
              sectionName={enrollment.classes?.name || null}
            />
          ))}
        </StaggeredGrid>
      )}
    </div>
  );
}
