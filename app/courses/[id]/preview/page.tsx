'use client';

import { useParams } from 'next/navigation';
import CoursePreview from '@/app/components/course/CoursePreview';
import Breadcrumb from '@/app/components/ui/Breadcrumb';

export default function CoursePreviewPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Course Preview' },
        ]}
      />
      <div className="mt-4">
        <CoursePreview courseId={courseId} previewOnly />
      </div>
    </div>
  );
}
