'use client';

import React, { use } from 'react';
import DiscussionDetail from '@/app/components/DiscussionDetail';

interface DiscussionPageProps {
  params: Promise<{ id: string; discussionId: string }>;
}

export default function DiscussionPage({ params }: DiscussionPageProps) {
  const { id: courseId, discussionId } = use(params);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-oecs-light-green/5 to-oecs-light-green/10">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <DiscussionDetail courseId={courseId} discussionId={discussionId} />
      </div>
    </div>
  );
}
