'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import RoleGuard from '@/app/components/RoleGuard';
import LessonList, { LessonItem } from '@/app/components/lesson/LessonList';

interface Course {
  id: string;
  title: string;
}

export default function ManageLessonsPage() {
  const searchParams = useSearchParams();
  const urlCourseId = searchParams.get('course_id') || '';
  const urlSectionId = searchParams.get('section_id') || '';

  const [courses, setCourses] = React.useState<Course[]>([]);
  const [courseId, setCourseId] = React.useState<string>(urlCourseId);
  const [lessons, setLessons] = React.useState<LessonItem[]>([]);
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [lessonsLoading, setLessonsLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [quickCreateTitle, setQuickCreateTitle] = React.useState('');
  const [showQuickCreate, setShowQuickCreate] = React.useState(false);
  const quickCreateRef = React.useRef<HTMLInputElement>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Load courses
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/courses');
        const data = await res.json();
        const list = (data.courses || []).map((c: Course) => ({ id: c.id, title: c.title }));
        setCourses(list);
        // Use URL course_id if provided, otherwise default to first course
        if (urlCourseId && list.some((c: Course) => c.id === urlCourseId)) {
          setCourseId(urlCourseId);
        } else if (!courseId && list[0]?.id) {
          setCourseId(list[0].id);
        }
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
    try {
      await fetch('/api/lessons/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, lessonOrders }),
      });
      showFeedback('success', 'Lesson order updated.');
      await loadLessons(courseId);
    } catch { showFeedback('error', 'Failed to reorder lessons.'); }
  };

  const onEdit = (id: string) => {
    window.location.href = `/lessons/${id}/edit`;
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
      showFeedback('success', 'Lesson deleted.');
      await loadLessons(courseId);
    } catch { showFeedback('error', 'Failed to delete lesson.'); }
  };

  const onTogglePublish = async (id: string) => {
    try {
      await fetch(`/api/lessons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: true }),
      });
      showFeedback('success', 'Lesson published.');
      await loadLessons(courseId);
    } catch { showFeedback('error', 'Failed to publish lesson.'); }
  };

  const quickCreate = async () => {
    if (!courseId) { showFeedback('error', 'Please select a course first.'); return; }
    if (!quickCreateTitle.trim()) return;
    try {
      const lessonPayload: any = { course_id: courseId, title: quickCreateTitle.trim() };
      if (urlSectionId) lessonPayload.section_id = urlSectionId;
      await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonPayload),
      });
      showFeedback('success', `Lesson "${quickCreateTitle.trim()}" created.`);
      setQuickCreateTitle('');
      setShowQuickCreate(false);
      await loadLessons(courseId);
    } catch { showFeedback('error', 'Failed to create lesson.'); }
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
              href={courseId ? `/lessons/create?course_id=${courseId}${urlSectionId ? `&section_id=${urlSectionId}` : ''}` : '/lessons/create'}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Lesson
            </Link>
            <button
              onClick={() => {
                setShowQuickCreate(!showQuickCreate);
                setTimeout(() => quickCreateRef.current?.focus(), 50);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Quick Create
            </button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`mt-4 rounded-lg border p-3 text-sm ${
            feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {feedback.message}
          </div>
        )}

        {/* Quick Create Inline */}
        {showQuickCreate && (
          <div className="mt-4 flex items-center gap-2">
            <input
              ref={quickCreateRef}
              type="text"
              value={quickCreateTitle}
              onChange={(e) => setQuickCreateTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && quickCreate()}
              placeholder="Enter lesson title..."
              className="flex-1 rounded-md border bg-white p-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={quickCreate}
              disabled={!quickCreateTitle.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => { setShowQuickCreate(false); setQuickCreateTitle(''); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        )}

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
            <div className="rounded-lg border bg-white p-12 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-500">Select a course to view its lessons</p>
            </div>
          ) : lessonsLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={`skeleton-${i}`} className="animate-pulse h-16 bg-gray-200 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border bg-white p-12 text-center">
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
