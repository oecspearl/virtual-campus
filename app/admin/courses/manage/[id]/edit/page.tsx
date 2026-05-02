'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminCourseEditRedirectPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (courseId) {
      router.replace(`/courses/${courseId}/edit`);
    }
  }, [courseId, router]);

  return null;
}
