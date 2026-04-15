'use client';

import React, { use } from 'react';
import LessonDiscussionDetail from '@/app/components/discussions/LessonDiscussionDetail';
import { Icon } from '@iconify/react';

interface LessonDiscussionPageProps {
  params: Promise<{ id: string; lessonId: string; discussionId: string }>;
}

export default function LessonDiscussionPage({ params }: LessonDiscussionPageProps) {
  const { id: courseId, lessonId, discussionId } = use(params);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <Icon icon="material-symbols:forum" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-normal text-slate-900 tracking-tight">Lesson Discussion</h1>
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
