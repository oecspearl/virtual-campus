'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
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
import RoleGuard from '@/app/components/RoleGuard';
import { useSupabase } from '@/lib/supabase-provider';
import { isStaffRole, STAFF_ROLES } from './helpers';
import type { QuizData, AssignmentData, DiscussionData } from './types';

interface CourseAssessmentsProps {
  courseId: string;
  quizzes: QuizData[];
  assignments: AssignmentData[];
  discussions: DiscussionData[];
  userRole: string | null;
  isEnrolled: boolean;
  readOnly?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

// dnd-kit needs each sortable item to have a globally unique id within its
// SortableContext. Quizzes and assignments live in different tables, so we
// prefix the dnd id with type.
type ReorderItem =
  | ({ kind: 'quiz' } & QuizData)
  | ({ kind: 'assignment' } & AssignmentData);

const dndId = (item: ReorderItem) => `${item.kind}:${item.id}`;

// ─── Per-student status types ───────────────────────────────────────────────
// Returned by /api/courses/[id]/my-assessment-status. Keep in sync with
// the API route's response shape.

type AssignmentStatusRow = {
  status: 'draft' | 'submitted' | 'graded';
  grade: number | null;
  submitted_at: string | null;
  late: boolean;
};

type QuizStatusRow = {
  status: 'in_progress' | 'submitted' | 'graded';
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  attempt_number: number;
  submitted_at: string | null;
};

// Format a due date as a human hint like "Due in 3 days" / "Due today" /
// "Overdue · Mar 5". Falls back to a plain date for distant due dates.
function formatDueHint(due: string | null | undefined): string {
  if (!due) return '';
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((d.getTime() - now.getTime()) / dayMs);
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (diffDays < 0) return `Overdue · ${dateStr}`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;
  return `Due ${dateStr}`;
}

export default function CourseAssessments({
  courseId,
  quizzes: quizzesProp,
  assignments: assignmentsProp,
  discussions,
  userRole,
  isEnrolled: _isEnrolled,
  readOnly = false,
  collapsible = false,
  defaultOpen = true,
}: CourseAssessmentsProps) {
  const { supabase } = useSupabase();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isStaff = isStaffRole(userRole);

  // Mirror the prop lists locally so delete / reorder can mutate without
  // requiring the parent to refetch. The parent's props remain the
  // initial source on first render and after navigation.
  const [quizzes, setQuizzes] = useState<QuizData[]>(quizzesProp);
  const [assignments, setAssignments] = useState<AssignmentData[]>(assignmentsProp);
  useEffect(() => setQuizzes(quizzesProp), [quizzesProp]);
  useEffect(() => setAssignments(assignmentsProp), [assignmentsProp]);

  const [reorderMode, setReorderMode] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<ReorderItem[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Per-student status maps: each key is an assignment_id / quiz_id pointing
  // at the current user's most recent / best attempt. Used to badge each
  // row ("Submitted", "Graded · 85/100", "In progress", etc.). Staff don't
  // need this — they have Grade/Results buttons.
  const [assignmentStatus, setAssignmentStatus] = useState<
    Record<string, AssignmentStatusRow>
  >({});
  const [quizStatus, setQuizStatus] = useState<Record<string, QuizStatusRow>>({});

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, [supabase]);

  // Fetch the current user's per-assessment status. We only need this for
  // students; staff have Grade/Results pages and don't need self-status.
  useEffect(() => {
    if (isStaff) return;
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/courses/${courseId}/my-assessment-status`, {
          headers,
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setAssignmentStatus(data.assignments || {});
        setQuizStatus(data.quizzes || {});
      } catch (err) {
        console.error('Failed to fetch assessment status:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, isStaff, getAuthHeaders]);

  const visibleAssignments = useMemo(
    () => assignments.filter((a) => a.published || (isStaff && !readOnly)),
    [assignments, isStaff, readOnly],
  );

  // Defense in depth: the API already filters drafts for non-staff, but
  // mirror the same rule here so a stale prop or future caller can't leak
  // unpublished quizzes to students.
  const visibleQuizzes = useMemo(
    () => quizzes.filter((q) => q.published || (isStaff && !readOnly)),
    [quizzes, isStaff, readOnly],
  );

  const sortedQuizzes = useMemo(() => {
    return [...visibleQuizzes].sort((a, b) => {
      const ao = a.curriculum_order ?? Number.POSITIVE_INFINITY;
      const bo = b.curriculum_order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.title.localeCompare(b.title);
    });
  }, [visibleQuizzes]);

  const sortedAssignments = useMemo(() => {
    return [...visibleAssignments].sort((a, b) => {
      const ao = a.curriculum_order ?? Number.POSITIVE_INFINITY;
      const bo = b.curriculum_order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      if (a.due_date && b.due_date)
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [visibleAssignments]);

  const reorderable: ReorderItem[] = useMemo(
    () => [
      ...sortedQuizzes.map((q) => ({ kind: 'quiz' as const, ...q })),
      ...sortedAssignments.map((a) => ({ kind: 'assignment' as const, ...a })),
    ],
    [sortedQuizzes, sortedAssignments],
  );

  const totalCount = visibleQuizzes.length + visibleAssignments.length + discussions.length;
  const hasAssessments =
    visibleQuizzes.length > 0 || visibleAssignments.length > 0 || discussions.length > 0;

  const enterReorderMode = () => {
    setReorderDraft(reorderable);
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
      const assignmentOrders: { id: string; order: number }[] = [];
      const quizOrders: { id: string; order: number }[] = [];
      reorderDraft.forEach((item, index) => {
        const entry = { id: item.id, order: index + 1 };
        if (item.kind === 'assignment') assignmentOrders.push(entry);
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

      // Reflect new order locally so the page doesn't need a full refetch.
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

  const handleDelete = async (kind: 'quiz' | 'assignment', id: string, title: string) => {
    const confirmed = window.confirm(
      `Delete the ${kind} "${title}"? This will also remove any submissions, attempts, and gradebook entries linked to it. This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const authHeaders = await getAuthHeaders();
      const endpoint = kind === 'quiz' ? `/api/quizzes/${id}` : `/api/assignments/${id}`;
      const res = await fetch(endpoint, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || `Failed to delete ${kind}`);
        return;
      }
      if (kind === 'quiz') {
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
      } else {
        setAssignments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error(`Delete ${kind} error:`, err);
      alert(`Failed to delete ${kind}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (!hasAssessments && readOnly) return null;

  if (!hasAssessments && !readOnly) {
    // Empty state: staff see "Create Quiz/Assignment" buttons; students
    // see a friendly placeholder so the tab doesn't render as a blank card.
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div
          className={`px-4 sm:px-5 py-3 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none' : ''}`}
          onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
        >
          <div className="flex items-center justify-between">
            <h2
              className="text-base sm:text-lg font-display text-gray-900 border-l-[3px] pl-3"
              style={{ borderColor: 'var(--theme-accent, #F59E0B)' }}
            >
              Course Assessments
            </h2>
            {collapsible && (
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </div>
        </div>
        {(!collapsible || isOpen) && (
          <div className="p-3 sm:p-4">
            <div className="text-center py-6">
              <Icon
                icon="material-symbols:assignment"
                className="w-10 h-10 text-gray-300 mx-auto mb-2"
              />
              {isStaff ? (
                <>
                  <p className="text-sm text-gray-600 mb-3">No course assessments yet</p>
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/quizzes/create?course_id=${courseId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Icon icon="material-symbols:quiz" className="w-4 h-4" />
                      Create Quiz
                    </Link>
                    <Link
                      href={`/assignments/create?course_id=${courseId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Icon icon="material-symbols:edit-document" className="w-4 h-4" />
                      Create Assignment
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Your instructor hasn&apos;t published any assessments for this course yet.
                  Check back soon.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const showStaffActions = isStaff && !readOnly;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div
        className={`px-4 sm:px-5 py-3 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="material-symbols:assignment" className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Assessments
              <span className="ml-2 text-sm font-normal text-gray-500">({totalCount})</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!readOnly && !collapsible && showStaffActions && (
              <>
                {reorderMode ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exitReorderMode();
                      }}
                      disabled={savingOrder}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        saveOrder();
                      }}
                      disabled={savingOrder}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {savingOrder ? 'Saving…' : 'Save order'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        enterReorderMode();
                      }}
                      disabled={reorderable.length < 2}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        reorderable.length < 2
                          ? 'Need at least two items to reorder'
                          : 'Reorder assessments'
                      }
                    >
                      <Icon icon="material-symbols:reorder" className="w-3.5 h-3.5" />
                      Reorder
                    </button>
                    <Link
                      href={`/quizzes/create?course_id=${courseId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Icon icon="material-symbols:add" className="w-3.5 h-3.5" />
                      Quiz
                    </Link>
                    <Link
                      href={`/assignments/create?course_id=${courseId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                    >
                      <Icon icon="material-symbols:add" className="w-3.5 h-3.5" />
                      Assignment
                    </Link>
                  </>
                )}
              </>
            )}
            {collapsible && (
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {(!collapsible || isOpen) && (
        <div className="p-3 sm:p-4">
          {reorderMode ? (
            <>
              <p className="text-xs text-slate-500 mb-3">
                Drag rows to reorder. The new order applies to both quizzes and assignments.
                Discussions are not reordered here.
              </p>
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
                      <SortableAssessmentRow key={dndId(item)} item={item} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          ) : (
            <div className="space-y-2">
              {sortedQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-100 hover:border-blue-200 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon icon="material-symbols:quiz" className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        Quiz
                      </span>
                      {!quiz.published && (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Draft
                        </span>
                      )}
                      {!isStaff && quizStatus[quiz.id] && (
                        <QuizStatusBadge status={quizStatus[quiz.id]} />
                      )}
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {quiz.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      {quiz.time_limit && (
                        <span className="flex items-center gap-1">
                          <Icon icon="material-symbols:timer" className="w-3 h-3" />
                          {quiz.time_limit}m
                        </span>
                      )}
                      {quiz.passing_score && (
                        <span className="flex items-center gap-1">
                          <Icon icon="material-symbols:target" className="w-3 h-3" />
                          {quiz.passing_score}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <Link
                      href={`/quiz/${quiz.id}/attempt`}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Take
                    </Link>
                    {!readOnly && (
                      <RoleGuard roles={[...STAFF_ROLES]}>
                        <Link
                          href={`/grade/quiz/${quiz.id}`}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                        >
                          Results
                        </Link>
                        <Link
                          href={`/quizzes/${quiz.id}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
                          title="Edit quiz"
                        >
                          <Icon icon="material-symbols:edit-outline" className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete('quiz', quiz.id, quiz.title)}
                          disabled={deletingId === quiz.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                          title="Delete quiz"
                        >
                          {deletingId === quiz.id ? (
                            <Icon
                              icon="material-symbols:hourglass-empty"
                              className="w-3.5 h-3.5 animate-spin"
                            />
                          ) : (
                            <Icon
                              icon="material-symbols:delete-outline"
                              className="w-3.5 h-3.5"
                            />
                          )}
                          Delete
                        </button>
                      </RoleGuard>
                    )}
                  </div>
                </div>
              ))}

              {sortedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-lg border border-green-100 hover:border-green-200 transition-colors"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon
                      icon="material-symbols:edit-document"
                      className="w-4 h-4 text-green-600"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                        Assignment
                      </span>
                      {!assignment.published && (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Draft
                        </span>
                      )}
                      {!isStaff && (
                        <AssignmentStatusBadge
                          status={assignmentStatus[assignment.id]}
                          dueDate={assignment.due_date}
                        />
                      )}
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {assignment.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      {assignment.due_date && (
                        <span className="flex items-center gap-1">
                          <Icon icon="material-symbols:calendar-today" className="w-3 h-3" />
                          {formatDueHint(assignment.due_date)}
                        </span>
                      )}
                      {assignment.points && (
                        <span className="flex items-center gap-1">
                          <Icon icon="material-symbols:star" className="w-3 h-3" />
                          {assignment.points}pts
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <Link
                      href={`/assignment/${assignment.id}`}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      View
                    </Link>
                    {!readOnly && (
                      <RoleGuard roles={[...STAFF_ROLES]}>
                        <Link
                          href={`/grade/assignment/${assignment.id}`}
                          className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                        >
                          Grade
                        </Link>
                        <Link
                          href={`/assignments/${assignment.id}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
                          title="Edit assignment"
                        >
                          <Icon icon="material-symbols:edit-outline" className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete('assignment', assignment.id, assignment.title)
                          }
                          disabled={deletingId === assignment.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                          title="Delete assignment"
                        >
                          {deletingId === assignment.id ? (
                            <Icon
                              icon="material-symbols:hourglass-empty"
                              className="w-3.5 h-3.5 animate-spin"
                            />
                          ) : (
                            <Icon
                              icon="material-symbols:delete-outline"
                              className="w-3.5 h-3.5"
                            />
                          )}
                          Delete
                        </button>
                      </RoleGuard>
                    )}
                  </div>
                </div>
              ))}

              {discussions.map((discussion) => (
                <div
                  key={discussion.id}
                  className="flex items-center gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-purple-50/50 to-violet-50/50 rounded-lg border border-purple-100 hover:border-purple-200 transition-colors"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon icon="material-symbols:forum" className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                        Discussion
                      </span>
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {discussion.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      {discussion.points && (
                        <span className="flex items-center gap-1">
                          <Icon icon="material-symbols:star" className="w-3 h-3" />
                          {discussion.points}pts
                        </span>
                      )}
                      {discussion.due_date && (
                        <span className="flex items-center gap-1">
                          <Icon icon="material-symbols:calendar-today" className="w-3 h-3" />
                          {new Date(discussion.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/course/${courseId}/discussions/${discussion.id}`}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                      Join
                    </Link>
                    {!readOnly && (
                      <RoleGuard roles={[...STAFF_ROLES]}>
                        <Link
                          href={`/course/${courseId}/discussions/${discussion.id}?grade=true`}
                          className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                        >
                          Grade
                        </Link>
                      </RoleGuard>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sortable row used inside reorder mode ─────────────────────────────────

function SortableAssessmentRow({ item }: { item: ReorderItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: dndId(item) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isQuiz = item.kind === 'quiz';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border transition-shadow ${
        isQuiz
          ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-100'
          : 'bg-gradient-to-r from-green-50/50 to-emerald-50/50 border-green-100'
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700"
        aria-label="Drag to reorder"
      >
        <Icon icon="material-symbols:drag-indicator" className="w-5 h-5" />
      </button>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isQuiz ? 'bg-blue-100' : 'bg-green-100'
        }`}
      >
        <Icon
          icon={isQuiz ? 'material-symbols:quiz' : 'material-symbols:edit-document'}
          className={`w-4 h-4 ${isQuiz ? 'text-blue-600' : 'text-green-600'}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              isQuiz ? 'text-blue-600 bg-blue-100' : 'text-green-600 bg-green-100'
            }`}
          >
            {isQuiz ? 'Quiz' : 'Assignment'}
          </span>
          {!item.published && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Draft
            </span>
          )}
          <div className="font-medium text-sm text-gray-900 truncate">{item.title}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Per-student status badges ──────────────────────────────────────────────

function AssignmentStatusBadge({
  status,
  dueDate,
}: {
  status: AssignmentStatusRow | undefined;
  dueDate: string | null | undefined;
}) {
  // No submission yet: surface "Overdue" if past due, otherwise nothing —
  // the "Due in N days" hint below the title already tells them about
  // upcoming work.
  if (!status) {
    if (dueDate) {
      const due = new Date(dueDate);
      if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
        return (
          <span className="text-xs font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
            Overdue
          </span>
        );
      }
    }
    return null;
  }

  if (status.status === 'graded') {
    const grade = status.grade;
    return (
      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
        Graded{grade != null ? ` · ${grade} pts` : ''}
        {status.late && ' · Late'}
      </span>
    );
  }

  if (status.status === 'submitted') {
    return (
      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
        Submitted{status.late && ' · Late'}
      </span>
    );
  }

  // status === 'draft'
  return (
    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
      Draft saved
    </span>
  );
}

function QuizStatusBadge({ status }: { status: QuizStatusRow }) {
  if (status.status === 'in_progress') {
    return (
      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
        In progress
      </span>
    );
  }

  // submitted / graded — show score where available
  const pieces: string[] = [];
  if (status.percentage != null) {
    pieces.push(`${Math.round(status.percentage)}%`);
  } else if (status.score != null && status.max_score != null) {
    pieces.push(`${status.score}/${status.max_score}`);
  }
  if (status.attempt_number > 1) {
    pieces.push(`Attempt ${status.attempt_number}`);
  }
  const detail = pieces.length ? ` · ${pieces.join(' · ')}` : '';
  const label = status.status === 'graded' ? 'Graded' : 'Submitted';
  return (
    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
      {label}
      {detail}
    </span>
  );
}
