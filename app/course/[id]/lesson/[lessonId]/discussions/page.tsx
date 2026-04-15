'use client';

import React, { use } from 'react';
import LessonDiscussionList from '@/app/components/discussions/LessonDiscussionList';

interface LessonDiscussionsPageProps {
  params: Promise<{ id: string; lessonId: string }>;
}

export default function LessonDiscussionsPage({ params }: LessonDiscussionsPageProps) {
  const { id: courseId, lessonId } = use(params);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-oecs-light-green/5 to-oecs-light-green/10">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <LessonDiscussionList courseId={courseId} lessonId={lessonId} />
      </div>
    </div>
  );
}
