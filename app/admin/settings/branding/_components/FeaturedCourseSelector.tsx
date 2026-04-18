'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { stripHtml } from '@/lib/utils';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

export interface FeaturedCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
}

export interface FeaturedCourseSelectorProps {
  availableCourses: FeaturedCourse[];
  selectedCourseIds: string[];
  onSelectionChange: (courseIds: string[]) => void;
  loading: boolean;
}

/**
 * Search + pick list for "featured courses" on the homepage. Shows the
 * available courses, a live filter, and a summary row of currently
 * selected course IDs with removal chips. The order of selection is
 * preserved — new picks append to the end.
 */
export default function FeaturedCourseSelector({
  availableCourses,
  selectedCourseIds,
  onSelectionChange,
  loading,
}: FeaturedCourseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const toggleCourse = (courseId: string) => {
    if (selectedCourseIds.includes(courseId)) {
      onSelectionChange(selectedCourseIds.filter((id) => id !== courseId));
    } else {
      onSelectionChange([...selectedCourseIds, courseId]);
    }
  };

  const filteredCourses = availableCourses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stripHtml(course.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">
          <LoadingIndicator variant="dots" size="sm" text="Loading courses..." />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>
            No courses found.{' '}
            {availableCourses.length === 0
              ? 'No published courses available.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {selectedCourseIds.length} of {filteredCourses.length} courses selected
            </p>
            {selectedCourseIds.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectionChange([])}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <div className="divide-y divide-gray-200">
              {filteredCourses.map((course) => {
                const isSelected = selectedCourseIds.includes(course.id);
                return (
                  <div
                    key={course.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                    onClick={() => toggleCourse(course.id)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCourse(course.id)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1">{course.title}</h4>
                        {course.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {stripHtml(course.description)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {course.thumbnail && (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span className="text-xs text-gray-500">
                            ID: {course.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Icon
                          icon="mdi:check-circle"
                          className="w-5 h-5 text-blue-600 flex-shrink-0"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedCourseIds.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Selected Courses (in order):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCourseIds.map((courseId, index) => {
                  const course = availableCourses.find((c) => c.id === courseId);
                  return (
                    <div
                      key={courseId}
                      className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-blue-200"
                    >
                      <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                      <span className="text-xs text-gray-700">
                        {course?.title || courseId.substring(0, 8)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCourse(courseId)}
                        className="text-blue-600 hover:text-blue-800"
                        aria-label={`Remove ${course?.title || courseId}`}
                      >
                        <Icon icon="mdi:close" className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Tip: Courses will be displayed in the order they appear above. Drag to reorder
                (coming soon).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
