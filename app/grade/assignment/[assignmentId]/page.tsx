"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import GradingPanel from "@/app/components/assignment/GradingPanel";
import PeerReviewManager from "@/app/components/assignment/PeerReviewManager";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Submission = any;

type StatusFilter = 'all' | 'ungraded' | 'graded' | 'late';

export default function Page() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = Array.isArray(params.assignmentId)
    ? params.assignmentId[0]
    : params.assignmentId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assignment, setAssignment] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPeerReviewManager, setShowPeerReviewManager] = useState(false);
  const [anonymousGrading, setAnonymousGrading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!assignmentId) {
      setError('Assignment ID is missing');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res1 = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}`);
      if (!res1.ok) {
        setError(`Failed to load assignment: ${res1.status}`);
        return;
      }
      const a = await res1.json();
      setAssignment(a);

      const res2 = await fetch(
        `/api/assignments/${encodeURIComponent(assignmentId)}/submissions?all=1`
      );
      if (!res2.ok) {
        setError(`Failed to load submissions: ${res2.status}`);
        return;
      }
      const s = await res2.json();
      const list: Submission[] = Array.isArray(s.submissions)
        ? s.submissions
        : s.submissions
        ? [s.submissions]
        : [];
      setSubmissions(list);
      setAnonymousGrading(Boolean(s.anonymous_grading));
      // Preserve selected submission across reloads when possible.
      setActiveId((prev) => {
        if (prev && list.some((x) => x.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      console.error('Error loading data:', err);
      setError(`Error loading data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Derived state ──────────────────────────────────────────────────────

  const maxPoints = Number(assignment?.points ?? 100) || 100;
  const dueDate = assignment?.due_date ? new Date(assignment.due_date) : null;

  const isLate = useCallback(
    (s: Submission) => {
      if (!dueDate || !s.submitted_at) return false;
      return new Date(s.submitted_at) > dueDate;
    },
    [dueDate]
  );

  const isGraded = (s: Submission) =>
    s.grade !== null && s.grade !== undefined && s.grade !== '';

  const stats = useMemo(() => {
    let graded = 0;
    let ungraded = 0;
    let late = 0;
    for (const s of submissions) {
      if (isGraded(s)) graded++;
      else ungraded++;
      if (isLate(s)) late++;
    }
    return { graded, ungraded, late, total: submissions.length };
  }, [submissions, isLate]);

  const displayName = useCallback(
    (s: Submission): string => {
      if (anonymousGrading) {
        return s.users?.name || `Student ${String(s.id).slice(0, 6)}`;
      }
      return s.users?.name || s.users?.email || `Student ${String(s.id).slice(0, 6)}`;
    },
    [anonymousGrading]
  );

  const filteredSubmissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((s) => {
      if (statusFilter === 'graded' && !isGraded(s)) return false;
      if (statusFilter === 'ungraded' && isGraded(s)) return false;
      if (statusFilter === 'late' && !isLate(s)) return false;
      if (q) {
        const haystack = [
          displayName(s),
          s.users?.email ?? '',
          s.id ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, search, displayName, isLate]);

  const active = useMemo(
    () => submissions.find((s) => s.id === activeId) ?? null,
    [submissions, activeId]
  );

  // ─── Navigation ─────────────────────────────────────────────────────────

  const stepActive = useCallback(
    (delta: number) => {
      if (filteredSubmissions.length === 0) return;
      const idx = filteredSubmissions.findIndex((s) => s.id === activeId);
      const nextIdx = idx < 0 ? 0 : (idx + delta + filteredSubmissions.length) % filteredSubmissions.length;
      setActiveId(filteredSubmissions[nextIdx].id);
    },
    [filteredSubmissions, activeId]
  );

  const jumpToNextUngraded = useCallback(() => {
    const idx = submissions.findIndex((s) => s.id === activeId);
    const search = idx < 0 ? submissions : [...submissions.slice(idx + 1), ...submissions.slice(0, idx)];
    const next = search.find((s) => !isGraded(s));
    if (next) setActiveId(next.id);
  }, [submissions, activeId]);

  // Keyboard shortcuts: J/K (or ↓/↑) to step; N for next ungraded.
  // Cmd/Ctrl+Enter inside the grading form fires save+advance; that's
  // handled inside GradingPanel, which receives onSavedAdvance.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isFormField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isFormField) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        stepActive(1);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        stepActive(-1);
      } else if (e.key === 'n') {
        e.preventDefault();
        jumpToNextUngraded();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [stepActive, jumpToNextUngraded]);

  // Optimistic update — applied locally when GradingPanel saves a grade.
  // Avoids a full /submissions refetch and keeps the user's place in the
  // list. The next list refresh on mount catches any drift.
  const applyGradedSubmission = useCallback(
    (submissionId: string, patch: Partial<Submission>) => {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, ...patch } : s))
      );
    },
    []
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:loading" className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading grading interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="bg-slate-800 px-8 py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl font-medium text-white flex items-center mb-1">
                    <Icon icon="mdi:grading" className="w-7 h-7 mr-2" aria-hidden="true" />
                    Grade Assignment
                  </h1>
                  {assignment && (
                    <p className="text-slate-200 text-base truncate">
                      {assignment.title || 'Untitled Assignment'}
                    </p>
                  )}
                  <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>{maxPoints} pts</span>
                    {dueDate && <span>Due {dueDate.toLocaleDateString()}</span>}
                    {anonymousGrading && (
                      <span className="inline-flex items-center gap-1 text-amber-200">
                        <Icon icon="mdi:incognito" className="w-3.5 h-3.5" aria-hidden="true" />
                        Anonymous grading
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {assignment?.peer_review_enabled && (
                    <button
                      type="button"
                      onClick={() => setShowPeerReviewManager(!showPeerReviewManager)}
                      aria-pressed={showPeerReviewManager}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        showPeerReviewManager
                          ? 'bg-white text-slate-800'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <Icon icon="mdi:account-group" className="w-5 h-5" aria-hidden="true" />
                      Peer Reviews
                    </button>
                  )}
                  <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
                    <div className="text-lg font-bold text-white tabular-nums">
                      {stats.graded}
                      <span className="text-slate-300">/{stats.total}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-300">
                      Graded
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <Icon icon="mdi:alert-circle" className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" aria-hidden="true" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 text-lg mb-2">Error Loading Data</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  type="button"
                  onClick={load}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  <Icon icon="mdi:refresh" className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Peer Review Manager Panel */}
        {showPeerReviewManager && assignment?.peer_review_enabled && assignmentId && (
          <div className="mb-6">
            <PeerReviewManager
              assignmentId={assignmentId}
              onClose={() => setShowPeerReviewManager(false)}
            />
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Submissions List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
                <div className="bg-slate-700 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Icon icon="mdi:clipboard-list" className="w-5 h-5" aria-hidden="true" />
                    Submissions
                    <span className="ml-auto text-xs font-normal text-slate-300">
                      {filteredSubmissions.length} of {submissions.length}
                    </span>
                  </h3>
                </div>

                {/* Filters */}
                <div className="p-3 border-b border-gray-100 space-y-2">
                  <input
                    type="search"
                    placeholder={anonymousGrading ? 'Search by ID…' : 'Search by name or email…'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Search submissions"
                  />
                  <div className="flex gap-1" role="group" aria-label="Filter by status">
                    {(['all', 'ungraded', 'graded', 'late'] as StatusFilter[]).map((f) => {
                      const count =
                        f === 'all'
                          ? stats.total
                          : f === 'graded'
                          ? stats.graded
                          : f === 'ungraded'
                          ? stats.ungraded
                          : stats.late;
                      const active = statusFilter === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setStatusFilter(f)}
                          aria-pressed={active}
                          className={`flex-1 text-[11px] px-2 py-1 rounded capitalize transition-colors ${
                            active
                              ? 'bg-slate-800 text-white'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {f} <span className="opacity-70">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                  {stats.ungraded > 0 && (
                    <button
                      type="button"
                      onClick={jumpToNextUngraded}
                      className="w-full text-[11px] px-2 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Icon icon="mdi:fast-forward" className="w-3.5 h-3.5" aria-hidden="true" />
                      Next ungraded
                      <kbd className="ml-1 text-[10px] px-1 py-0.5 bg-white border border-blue-200 rounded">N</kbd>
                    </button>
                  )}
                </div>

                <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-380px)]">
                  {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-8">
                      <Icon icon="mdi:inbox-outline" className="w-12 h-12 text-gray-400 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-sm text-gray-500">
                        {submissions.length === 0
                          ? 'No submissions yet'
                          : 'No submissions match the current filters'}
                      </p>
                    </div>
                  ) : (
                    filteredSubmissions.map((s) => {
                      const isActive = activeId === s.id;
                      const graded = isGraded(s);
                      const late = isLate(s);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setActiveId(s.id)}
                          aria-current={isActive ? 'true' : undefined}
                          aria-label={`Grade submission from ${displayName(s)}${
                            graded ? `, currently ${s.grade}/${maxPoints}` : ', ungraded'
                          }`}
                          className={`w-full rounded-lg p-3 text-left transition-all ${
                            isActive
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">
                                {displayName(s)}
                              </div>
                              {!anonymousGrading && s.users?.email && (
                                <div
                                  className={`text-[11px] truncate ${
                                    isActive ? 'text-slate-300' : 'text-gray-500'
                                  }`}
                                >
                                  {s.users.email}
                                </div>
                              )}
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : graded
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {graded ? 'Graded' : 'Ungraded'}
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-2 text-[11px] ${
                              isActive ? 'text-slate-300' : 'text-gray-500'
                            }`}
                          >
                            {s.submitted_at && (
                              <span className="inline-flex items-center gap-1">
                                <Icon icon="mdi:clock-outline" className="w-3 h-3" aria-hidden="true" />
                                {new Date(s.submitted_at).toLocaleDateString()}
                              </span>
                            )}
                            {late && (
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  isActive ? 'text-amber-200' : 'text-amber-600'
                                }`}
                              >
                                <Icon icon="mdi:alert" className="w-3 h-3" aria-hidden="true" />
                                Late
                              </span>
                            )}
                          </div>
                          {graded && (
                            <div
                              className={`mt-2 pt-2 border-t text-sm tabular-nums ${
                                isActive ? 'border-white/20' : 'border-gray-200'
                              }`}
                            >
                              <span className="font-semibold">
                                {s.grade}
                              </span>
                              <span className={isActive ? 'text-slate-300' : 'text-gray-500'}>
                                {' / '}
                                {maxPoints}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="px-3 py-2 border-t border-gray-100 text-[10px] text-gray-400 hidden sm:block">
                  <kbd className="px-1 py-0.5 bg-gray-100 rounded">J</kbd> /{' '}
                  <kbd className="px-1 py-0.5 bg-gray-100 rounded">K</kbd> step ·{' '}
                  <kbd className="px-1 py-0.5 bg-gray-100 rounded">N</kbd> next ungraded ·{' '}
                  <kbd className="px-1 py-0.5 bg-gray-100 rounded">⌘↵</kbd> save &amp; next
                </div>
              </div>
            </div>

            {/* Grading Area */}
            <div className="lg:col-span-3">
              {active && assignment && assignmentId ? (
                <GradingPanel
                  assignmentId={assignmentId}
                  submission={active}
                  maxPoints={maxPoints}
                  onSaved={(patch) => {
                    applyGradedSubmission(active.id, patch);
                    // Auto-advance to the next ungraded submission so the
                    // grader stays in the flow.
                    jumpToNextUngraded();
                  }}
                />
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-12">
                  <div className="text-center">
                    <Icon icon="mdi:hand-pointing-up" className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Submission</h3>
                    <p className="text-gray-600 mb-4">
                      {!assignment
                        ? 'Assignment data not loaded.'
                        : submissions.length === 0
                        ? 'No submissions available to grade yet.'
                        : 'Choose a submission from the left sidebar to begin grading.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
