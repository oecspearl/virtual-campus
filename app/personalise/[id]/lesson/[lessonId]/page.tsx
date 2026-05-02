'use client';

// Phase 9b transition shim. The previous path-context lesson viewer at this
// URL only used LessonViewer for content rendering, which produced a
// "stacked blocks" layout regardless of content_type. The course-context
// lesson page now accepts ?path=<pathId> and renders SCORM, RichText, Video,
// and mixed-content lessons with the same dispatch the rest of the app uses
// — so we redirect here to that single source of truth.

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';

export default function PathLessonRedirectPage() {
  const { id: pathId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const { supabase } = useSupabase();
  const router = useRouter();
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError(true); return; }
      const res = await fetch(`/api/courses/personalise/${pathId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (cancelled) return;
      if (!res.ok) { setError(true); return; }
      const detail = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = (detail.items ?? []).find((i: any) => i.lesson_id === lessonId);
      if (!item?.course_id) { setError(true); return; }
      router.replace(`/course/${item.course_id}/lesson/${lessonId}?path=${pathId}`);
    })();
    return () => { cancelled = true; };
  }, [pathId, lessonId, router, supabase]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-xl font-medium text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }
  return <div className="mx-auto max-w-4xl px-4 py-8 text-gray-500">Loading…</div>;
}
