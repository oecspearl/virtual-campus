'use client';

import React from 'react';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import LessonList, { LessonItem } from '@/app/components/LessonList';

interface Course {
  id: string;
  title: string;
}

export default function ManageLessonsPage() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [courseId, setCourseId] = React.useState<string>('');
  const [lessons, setLessons] = React.useState<LessonItem[]>([]);
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [lessonsLoading, setLessonsLoading] = React.useState(false);

  // Load courses
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/courses');
        const data = await res.json();
        const list = (data.courses || []).map((c: Course) => ({ id: c.id, title: c.title }));
        setCourses(list);
        if (list[0]?.id) setCourseId(list[0].id);
      } catch {
        console.error('Failed to load courses');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadLessons = React.useCallback(async (cid: string) => {
    if (!cid) { setLessons([]); return; }
    setLessonsLoading(true);
    try {
      const res = await fetch(`/api/lessons?course_id=${cid}`);
      const data = await res.json();
      setLessons(
        (data.lessons || []).map((l: Record<string, unknown>) => ({
          id: l.id as string,
          title: l.title as string,
          description: (l.description as string) || '',
          estimated_time: (l.estimated_time as number) || 0,
          difficulty: (l.difficulty as number) || 1,
        }))
      );
    } catch {
      console.error('Failed to load lessons');
    } finally {
      setLessonsLoading(false);
    }
  }, []);

  React.useEffect(() => { loadLessons(courseId); }, [courseId, loadLessons]);

  const filtered = lessons.filter(
    l => !q || l.title.toLowerCase().includes(q.toLowerCase()) || (l.description || '').toLowerCase().includes(q.toLowerCase())
  );

  const onReorder = async (orderedIds: string[]) => {
    const lessonOrders = orderedIds.map((id, i) => ({ lessonId: id, order: i }));
    await fetch('/api/lessons/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, lessonOrders }),
    });
    await loadLessons(courseId);
  };

  const onEdit = (id: string) => {
    window.location.href = `/lessons/${id}/edit`;
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
    await loadLessons(courseId);
  };

  const onTogglePublish = async (id: string) => {
    await fetch(`/api/lessons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: true }),
    });
    await loadLessons(courseId);
  };

  const quickCreate = async () => {
    if (!courseId) { alert('Please select a course first'); return; }
    const title = prompt('Lesson title?');
    if (!title?.trim()) return;
    await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, title: title.trim() }),
    });
    await loadLessons(courseId);
  };

  return (
    <RoleGuard
      roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-8">
          <p className="text-sm text-gray-700">Access denied.</p>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-medium text-gray-900">Manage Lessons</h1>
          <div className="flex gap-2">
            <Link
              href={courseId ? `/lessons/create?course_id=${courseId}` : '/lessons/create'}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Lesson
            </Link>
            <button
              onClick={quickCreate}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Quick Create
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {loading ? (
            <div className="animate-pulse h-10 bg-gray-200 rounded-md" />
          ) : (
            <select
              className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          )}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lessons..."
            className="rounded-md border bg-white p-2 text-sm text-gray-700"
          />
          <div className="flex items-center justify-end text-sm text-gray-500">
            {filtered.length} lesson{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Lessons List */}
        <div className="mt-6">
          {!courseId ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-500">Select a course to view its lessons</p>
            </div>
          ) : lessonsLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 mb-3">No lessons in this course yet</p>
              <Link
                href={`/lessons/create?course_id=${courseId}`}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create the first lesson
              </Link>
            </div>
          ) : (
            <LessonList
              items={filtered}
              onReorder={onReorder}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePublish={onTogglePublish}
            />
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
