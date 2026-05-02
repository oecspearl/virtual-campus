'use client';

import React from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase-provider';
import Button from '@/app/components/ui/Button';

interface CourseSummary {
  id: string;
  learner_goal: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  approved_at: string | null;
}

export default function PersonalisedCoursesListPage() {
  const { supabase } = useSupabase();
  const [loading, setLoading] = React.useState(true);
  const [courses, setCourses] = React.useState<CourseSummary[]>([]);
  const [featureDisabled, setFeatureDisabled] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const res = await fetch('/api/courses/personalise', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (cancelled) return;
      if (res.status === 404) {
        setFeatureDisabled(true);
      } else if (res.ok) {
        const data = await res.json();
        setCourses(data.courses ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-gray-500">Loading…</div>;
  }

  if (featureDisabled) {
    // Tenant flag off → 404 from API. Show a generic not-found rather than
    // a "feature is disabled" message, matching the no-leak design choice.
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-xl font-medium text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Personalised Paths</h1>
          <p className="text-sm text-gray-500 mt-1">
            Build a custom course by picking lessons from across the catalogue.
          </p>
        </div>
        <Link href="/personalise/build">
          <Button>Build a new path</Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">
          You haven&apos;t built any personalised paths yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {courses.map((c) => (
            <li key={c.id}>
              <Link
                href={`/personalise/${c.id}`}
                className="block rounded-lg border bg-white p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-2">{c.learner_goal}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Started {new Date(c.created_at).toLocaleDateString()}
                      {c.approved_at && ` · Approved ${new Date(c.approved_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CourseSummary['status'] }) {
  const palette = {
    draft: 'bg-amber-50 text-amber-800 border-amber-200',
    active: 'bg-green-50 text-green-800 border-green-200',
    archived: 'bg-gray-50 text-gray-600 border-gray-200',
  }[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${palette}`}>
      {status}
    </span>
  );
}
