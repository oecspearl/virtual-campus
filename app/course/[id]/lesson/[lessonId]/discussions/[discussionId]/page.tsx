'use client';

import React, { use } from 'react';
import LessonDiscussionDetail from '@/app/components/LessonDiscussionDetail';
import { Icon } from '@iconify/react';

interface LessonDiscussionPageProps {
  params: Promise<{ id: string; lessonId: string; discussionId: string }>;
}

export default function LessonDiscussionPage({ params }: LessonDiscussionPageProps) {
  const { id: courseId, lessonId, discussionId } = use(params);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Icon icon="material-symbols:forum" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lesson Discussion</h1>
              <p className="text-gray-600">Engage with your peers and instructors</p>
            </div>
          </div>
        </div>

        {/* Discussion Content */}
        <LessonDiscussionDetail
          courseId={courseId}
          lessonId={lessonId}
          discussionId={discussionId}
        />
      </div>
    </div>
  );
}
