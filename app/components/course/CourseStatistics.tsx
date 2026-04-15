'use client';

import React from 'react';
import { formatModality } from './helpers';

interface CourseStatisticsProps {
  lessonCount: number;
  estimatedDuration: string | null;
  difficulty: string;
  modality: string;
  enrollmentCount?: number;
  lastUpdated?: string | null;
}

function CourseStatisticsInner({ lessonCount, estimatedDuration, difficulty, modality, enrollmentCount, lastUpdated }: CourseStatisticsProps) {
  const stats = [
    {
      label: 'Lessons',
      value: lessonCount.toString(),
      color: 'var(--theme-primary)',
    },
    {
      label: 'Duration',
      value: estimatedDuration || 'Flexible',
      color: 'var(--theme-secondary)',
    },
    {
      label: 'Difficulty',
      value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      color: 'var(--theme-accent, #F59E0B)',
    },
    {
      label: 'Format',
      value: formatModality(modality),
      color: 'var(--theme-primary)',
    },
  ];

  // Add optional stats if available
  if (enrollmentCount !== undefined) {
    stats.push({
      label: 'Students',
      value: enrollmentCount.toString(),
      color: 'var(--theme-secondary)',
    });
  }
  if (lastUpdated) {
    stats.push({
      label: 'Updated',
      value: new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      color: 'var(--theme-accent, #6366F1)',
    });
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
        <h2
          className="text-base sm:text-lg font-display text-gray-900 border-l-[3px] pl-3"
          style={{ borderColor: 'var(--theme-secondary)' }}
        >
          Course at a Glance
        </h2>
      </div>
      <div className="p-3 sm:p-4">
        <div className={`grid gap-2 sm:gap-3 ${stats.length > 4 ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center p-3 sm:p-4 rounded-lg border border-gray-100"
              style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 5%, white)` }}
            >
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CourseStatistics = React.memo(CourseStatisticsInner);
export default CourseStatistics;
