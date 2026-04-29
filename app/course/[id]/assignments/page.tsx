'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@iconify/react';
import CourseTabBar from '@/app/components/course/CourseTabBar';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import RoleGuard from '@/app/components/RoleGuard';
import { useSupabase } from '@/lib/supabase-provider';

interface Assessment {
  id: string;
  title: string;
  description?: string;
  points?: number;
  due_date?: string;
  type: 'quiz' | 'assignment';
  time_limit?: number;
  passing_score?: number;
  // Assignments use `published`; quizzes use `is_published`. Both are
  // normalised to `published` after fetch.
  published?: boolean;
  curriculum_order?: number | null;
}

const STAFF_ROLES = ['instructor', 'curriculum_designer', 'admin', 'super_admin'];

// dnd-kit needs each sortable item to have a globally unique id within its
// SortableContext. Quizzes and assignments live in different tables, so a
// quiz uuid and an assignment uuid could collide in theory — and even if
// they don't, we want findIndex by `id` to be unambiguous. Prefix with type.
const dndId = (item: { type: 'quiz' | 'assignment'; id: string }) =>
  `${item.type}:${item.id}`;

export default function CourseAssignmentsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const [course, setCourse] = useState<{ title: string } | null>(null);
  const [quizzes, setQuizzes] = useState<Assessment[]>([]);
  const [assignments, setAssignments] = useState<Assessment[]>([]);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<Assessment[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Other course pages explicitly attach the Supabase access token to API
  // calls (see app/course/[id]/page.tsx). The cookie fallback in
  // authenticateUser usually works, but the explicit Bearer token avoids
  // intermittent 401s — particularly for /api/auth/profile, which gates
  // the staff-only Edit and Delete buttons on this page.
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, [supabase]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authHeaders = await getAuthHeaders();
        const [courseRes, quizzesRes, assignmentsRes, profileRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`, { cache: 'no-store', headers: authHeaders }),
          fetch(`/api/quizzes?course_id=${courseId}`, {
            cache: 'no-store',
            headers: authHeaders,
          }),
          fetch(`/api/assignments?course_id=${courseId}`, {
            cache: 'no-store',
            headers: authHeaders,
          }),
          fetch('/api/auth/profile', { cache: 'no-store', headers: authHeaders }),
        ]);

        if (courseRes.ok) setCourse(await courseRes.json());
        if (quizzesRes.ok) {
          const qData = await quizzesRes.json();
          setQuizzes(qData.quizzes || []);
        }
        if (assignmentsRes.ok) {
          const aData = await assignmentsRes.json();
          setAssignments(aData.assignments || []);
        }
        if (profileRes.ok) setProfile(await profileRes.json());
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId, getAuthHeaders]);

  const handleDelete = async (item: Assessment) => {
    const label = item.type === 'quiz' ? 'quiz' : 'assignment';
    const confirmed = window.confirm(
      `Delete the ${label} "${item.title}"? This will also remove any submissions, attempts, and gradebook entries linked to it. This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      const authHeaders = await getAuthHeaders();
      const endpoint =
        item.type === 'quiz'
          ? `/api/quizzes/${item.id}`
          : `/api/assignments/${item.id}`;
      const res = await fetch(endpoint, { method: 'DELETE', headers: authHeaders });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || `Failed to delete ${label}`);
        return;
      }

      if (item.type === 'quiz') {
        setQuizzes((prev) => prev.filter((q) => q.id !== item.id));
      } else {
        setAssignments((prev) => prev.filter((a) => a.id !== item.id));
      }
    } catch (err) {
      console.error(`Delete ${label} error:`, err);
      alert(`Failed to delete ${label}`);
    } finally {
      setDeletingId(null);
    }
  };

  const isStaff = !!profile?.role && STAFF_ROLES.includes(profile.role);

  // Filter unpublished items for non-staff (visual; the API also filters
  // assignments server-side, this is defense in depth + handles quizzes).
  const visibleAssignments = useMemo(
    () => assignments.filter((a) => isStaff || a.published === true),
    [assignments, isStaff],
  );
  const visibleQuizzes = useMemo(
    () => quizzes.filter((q) => isStaff || q.published === true),
    [quizzes, isStaff],
  );

  // Sort key: curriculum_order asc (nulls last) → due_date asc → title asc
  const sortItems = (items: Assessment[]) =>
    [...items].sort((a, b) => {
      const ao = a.curriculum_order ?? Number.POSITIVE_INFINITY;
      const bo = b.curriculum_order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      if (a.due_date && b.due_date)
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return a.title.localeCompare(b.title);
    });

  const allItems = useMemo(
    () =>
      sortItems([
        ...visibleQuizzes.map((q) => ({ ...q, type: 'quiz' as const })),
        ...visibleAssignments.map((a) => ({ ...a, type: 'assignment' as const })),
      ]),
    [visibleAssignments, visibleQuizzes],
  );

  const enterReorderMode = () => {
    setReorderDraft(allItems);
    setReorderMode(true);
  };

  const exitReorderMode = () => {
    setReorderMode(false);
    setReorderDraft([]);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setReorderDraft((items) => {
      const oldIndex = items.findIndex((i) => dndId(i) === active.id);
      const newIndex = items.findIndex((i) => dndId(i) === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      // Quizzes and assignments share a single ordering on this page even
      // though they live in separate tables. We assign sequential orders
      // across the full draft list (1, 2, 3, ...) and then split by type
      // before sending to each resource's reorder endpoint. The shared
      // sequence makes the on-screen order match what's persisted.
      const assignmentOrders: { id: string; order: number }[] = [];
      const quizOrders: { id: string; order: number }[] = [];
      reorderDraft.forEach((item, index) => {
        const entry = { id: item.id, order: index + 1 };
        if (item.type === 'assignment') assignmentOrders.push(entry);
        else quizOrders.push(entry);
      });

      const authHeaders = await getAuthHeaders();
      const calls: Promise<Response>[] = [];
      if (assignmentOrders.length > 0) {
        calls.push(
          fetch(`/api/courses/${courseId}/assignments/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ orders: assignmentOrders }),
          }),
        );
      }
      if (quizOrders.length > 0) {
        calls.push(
          fetch(`/api/courses/${courseId}/quizzes/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ orders: quizOrders }),
          }),
        );
      }

      const responses = await Promise.all(calls);
      const failed = responses.find((r) => !r.ok);
      if (failed) {
        const err = await failed.json().catch(() => ({}));
        alert(err.error || 'Failed to save order');
        return;
      }

      // Reflect new orders locally so we don't need to re-fetch.
      const aMap = new Map(assignmentOrders.map((o) => [o.id, o.order]));
      const qMap = new Map(quizOrders.map((o) => [o.id, o.order]));
      setAssignments((prev) =>
        prev.map((a) => ({
          ...a,
          curriculum_order: aMap.get(a.id) ?? a.curriculum_order ?? null,
        })),
      );
      setQuizzes((prev) =>
        prev.map((q) => ({
          ...q,
          curriculum_order: qMap.get(q.id) ?? q.curriculum_order ?? null,
        })),
      );
      exitReorderMode();
    } catch (err) {
      console.error('Save order error:', err);
      alert('Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <CourseTabBar courseId={courseId} />

      <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Courses', href: '/courses' },
            { label: course?.title || 'Course', href: `/course/${courseId}` },
            { label: 'Assignments' },
          ]}
          className="mb-6"
        />

        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-xl font-normal text-slate-900 tracking-tight">
            Assignments & Quizzes
          </h1>
          <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
            <div className="flex items-center gap-2">
              {reorderMode ? (
                <>
                  <button
                    onClick={exitReorderMode}
                    disabled={savingOrder}
                    className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveOrder}
                    disabled={savingOrder}
                    className="px-3 py-1.5 text-xs bg-slate-900 text-white hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
                  >
                    {savingOrder ? 'Saving…' : 'Save order'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={enterReorderMode}
                    disabled={allItems.length < 2}
                    className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    title={
                      allItems.length < 2
                        ? 'Need at least two items to reorder'
                        : 'Reorder assignments and quizzes'
                    }
                  >
                    <Icon icon="material-symbols:reorder" className="w-3.5 h-3.5" />
                    Reorder
                  </button>
                  <Link
                    href={`/assignments/create?course_id=${courseId}`}
                    className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    New Assignment
                  </Link>
                  <Link
                    href={`/quizzes/create?course_id=${courseId}`}
                    className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    New Quiz
                  </Link>
                </>
              )}
            </div>
          </RoleGuard>
        </div>

        {reorderMode && (
          <p className="text-xs text-slate-500 mb-3">
            Drag rows to reorder. The new order applies to both assignments and quizzes
            in this course.
          </p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200/80 p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : reorderMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={reorderDraft.map(dndId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {reorderDraft.map((item) => (
                  <SortableRow key={`${item.type}-${item.id}`} item={item} />
                ))}
                {reorderDraft.length === 0 && (
                  <div className="bg-white rounded-lg border border-gray-200/80 p-8 text-center text-sm text-slate-400">
                    Nothing to reorder.
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        ) : allItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200/80 p-12 text-center">
            <p className="text-sm text-slate-400">
              No assignments or quizzes in this course yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {allItems.map((item) => (
              <AssessmentRow
                key={`${item.type}-${item.id}`}
                item={item}
                isStaff={isStaff}
                onDelete={handleDelete}
                isDeleting={deletingId === item.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Row components ─────────────────────────────────────────────────────────

function AssessmentRow({
  item,
  isStaff,
  onDelete,
  isDeleting,
}: {
  item: Assessment;
  isStaff: boolean;
  onDelete: (item: Assessment) => void;
  isDeleting: boolean;
}) {
  const href =
    item.type === 'quiz' ? `/quiz/${item.id}/attempt` : `/assignment/${item.id}`;
  const editHref =
    item.type === 'quiz' ? `/quizzes/${item.id}/edit` : `/assignments/${item.id}/edit`;

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 px-5 py-4 hover:bg-gray-50 transition-colors group">
      <div className="flex items-center justify-between gap-3">
        <Link href={href} className="flex-1 min-w-0">
          <RowMeta item={item} />
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isStaff && (
            <>
              <Link
                href={editHref}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
                title={`Edit ${item.type}`}
                aria-label={`Edit ${item.type}`}
              >
                <Icon icon="material-symbols:edit-outline" className="w-3.5 h-3.5" />
                Edit
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(item);
                }}
                disabled={isDeleting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Delete ${item.type}`}
                aria-label={`Delete ${item.type}`}
              >
                {isDeleting ? (
                  <Icon
                    icon="material-symbols:hourglass-empty"
                    className="w-3.5 h-3.5 animate-spin"
                  />
                ) : (
                  <Icon icon="material-symbols:delete-outline" className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
            </>
          )}
          <Link
            href={href}
            aria-hidden="true"
            tabIndex={-1}
            className="text-slate-300 group-hover:text-slate-500 ml-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SortableRow({ item }: { item: Assessment }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: dndId(item as { type: 'quiz' | 'assignment'; id: string }) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border px-5 py-4 transition-shadow ${
        isDragging ? 'border-slate-400 shadow-lg' : 'border-gray-200/80'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700"
          aria-label="Drag to reorder"
        >
          <Icon icon="material-symbols:drag-indicator" className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <RowMeta item={item} />
        </div>
      </div>
    </div>
  );
}

function RowMeta({ item }: { item: Assessment }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
          {item.type === 'quiz' ? 'Quiz' : 'Assignment'}
        </span>
        {item.published === false && (
          <span className="text-[10px] font-medium text-amber-500 uppercase tracking-wider">
            Draft
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">
        {item.title}
      </h3>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
        {item.points != null && <span>{item.points} pts</span>}
        {item.due_date && (
          <>
            <span className="text-slate-200">|</span>
            <span>Due {new Date(item.due_date).toLocaleDateString()}</span>
          </>
        )}
        {item.type === 'quiz' && item.time_limit && (
          <>
            <span className="text-slate-200">|</span>
            <span>{item.time_limit} min</span>
          </>
        )}
      </div>
    </div>
  );
}
