'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

export default function CourseAssignmentsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [course, setCourse] = useState<{ title: string } | null>(null);
  const [quizzes, setQuizzes] = useState<Assessment[]>([]);
  const [assignments, setAssignments] = useState<Assessment[]>([]);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<Assessment[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, quizzesRes, assignmentsRes, profileRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`, { cache: 'no-store' }),
          fetch(`/api/quizzes?course_id=${courseId}`, { cache: 'no-store' }),
          fetch(`/api/assignments?course_id=${courseId}`, { cache: 'no-store' }),
          fetch('/api/auth/profile', { cache: 'no-store' }),
        ]);

        if (courseRes.ok) setCourse(await courseRes.json());
        if (quizzesRes.ok) {
          const qData = await quizzesRes.json();
          setQuizzes(
            (qData.quizzes || []).map((q: any) => ({
              ...q,
              published: q.is_published !== false,
            })),
          );
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
  }, [courseId]);

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

  // Reorder mode shows assignments only (quizzes are not draggable here yet).
  const sortedAssignments = useMemo(
    () => sortItems(visibleAssignments.map((a) => ({ ...a, type: 'assignment' as const }))),
    [visibleAssignments],
  );

  const enterReorderMode = () => {
    setReorderDraft(sortedAssignments);
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
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      const orders = reorderDraft.map((item, index) => ({ id: item.id, order: index + 1 }));
      const res = await fetch(`/api/courses/${courseId}/assignments/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to save assignment order');
        return;
      }

      // Reflect new order locally so we don't need to re-fetch.
      const orderMap = new Map(orders.map((o) => [o.id, o.order]));
      setAssignments((prev) =>
        prev.map((a) => ({
          ...a,
          curriculum_order: orderMap.get(a.id) ?? a.curriculum_order ?? null,
        })),
      );
      exitReorderMode();
    } catch (err) {
      console.error('Save order error:', err);
      alert('Failed to save assignment order');
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
                    disabled={sortedAssignments.length < 2}
                    className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    title={
                      sortedAssignments.length < 2
                        ? 'Need at least two assignments to reorder'
                        : 'Reorder assignments'
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
            Drag rows to reorder assignments. Quizzes are hidden in reorder mode.
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
              items={reorderDraft.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {reorderDraft.map((item) => (
                  <SortableAssignmentRow key={item.id} item={item} />
                ))}
                {reorderDraft.length === 0 && (
                  <div className="bg-white rounded-lg border border-gray-200/80 p-8 text-center text-sm text-slate-400">
                    No assignments to reorder.
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
              <AssessmentRow key={`${item.type}-${item.id}`} item={item} isStaff={isStaff} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Row components ─────────────────────────────────────────────────────────

function AssessmentRow({ item, isStaff }: { item: Assessment; isStaff: boolean }) {
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
        {isStaff && (
          <Link
            href={editHref}
            onClick={(e) => e.stopPropagation()}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title={`Edit ${item.type}`}
            aria-label={`Edit ${item.type}`}
          >
            <Icon icon="material-symbols:edit-outline" className="w-4 h-4" />
          </Link>
        )}
        <Link href={href} aria-hidden="true" tabIndex={-1} className="text-slate-300 group-hover:text-slate-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function SortableAssignmentRow({ item }: { item: Assessment }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

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
