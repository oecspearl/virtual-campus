'use client';

import React from 'react';

/**
 * Minimum shape this hook reads from each content item.
 */
export interface QuizAssignmentContentItem {
  type: string;
  data?: {
    quizId?: string;
    assignmentId?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuizRecord = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssignmentRecord = any;

export interface UseQuizAssignmentDataResult {
  /** quizId → quiz record (only ids that have been successfully fetched). */
  quizData: Record<string, QuizRecord>;
  /** assignmentId → assignment record. */
  assignmentData: Record<string, AssignmentRecord>;
  /** IDs currently being fetched — useful to show loading spinners. */
  loadingData: Set<string>;
  /** Quiz IDs that returned 404 — "Quiz Not Found" placeholders. */
  notFoundQuizzes: Set<string>;
  /** Assignment IDs that returned 404. */
  notFoundAssignments: Set<string>;
}

/**
 * Watches `content` and, for every quiz / assignment block it contains,
 * fetches the corresponding record from the API. Already-fetched IDs are
 * skipped; 404 responses are tracked in `notFoundQuizzes` /
 * `notFoundAssignments` so the UI can render an "orphan content" card.
 */
export function useQuizAssignmentData(
  content: readonly QuizAssignmentContentItem[]
): UseQuizAssignmentDataResult {
  const [quizData, setQuizData] = React.useState<Record<string, QuizRecord>>({});
  const [assignmentData, setAssignmentData] = React.useState<Record<string, AssignmentRecord>>({});
  const [loadingData, setLoadingData] = React.useState<Set<string>>(new Set());
  const [notFoundQuizzes, setNotFoundQuizzes] = React.useState<Set<string>>(new Set());
  const [notFoundAssignments, setNotFoundAssignments] = React.useState<Set<string>>(new Set());

  // Refs so the effect can read current state without re-subscribing —
  // otherwise the effect would fire every time fetched data lands, causing
  // a loop of refetches.
  const quizDataRef = React.useRef(quizData);
  const assignmentDataRef = React.useRef(assignmentData);
  const loadingDataRef = React.useRef(loadingData);
  const notFoundQuizzesRef = React.useRef(notFoundQuizzes);
  const notFoundAssignmentsRef = React.useRef(notFoundAssignments);

  quizDataRef.current = quizData;
  assignmentDataRef.current = assignmentData;
  loadingDataRef.current = loadingData;
  notFoundQuizzesRef.current = notFoundQuizzes;
  notFoundAssignmentsRef.current = notFoundAssignments;

  const markLoading = React.useCallback((id: string, isLoading: boolean) => {
    setLoadingData((prev) => {
      const next = new Set(prev);
      if (isLoading) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const fetchQuiz = React.useCallback(
    async (quizId: string) => {
      if (
        quizDataRef.current[quizId] ||
        loadingDataRef.current.has(quizId) ||
        notFoundQuizzesRef.current.has(quizId)
      ) {
        return;
      }
      markLoading(quizId, true);
      try {
        const res = await fetch(`/api/quizzes/${quizId}`);
        if (res.ok) {
          const data = await res.json();
          setQuizData((prev) => ({ ...prev, [quizId]: data }));
        } else if (res.status === 404) {
          setNotFoundQuizzes((prev) => new Set(prev).add(quizId));
        }
      } catch (error) {
        console.error('useQuizAssignmentData: quiz fetch failed', error);
      } finally {
        markLoading(quizId, false);
      }
    },
    [markLoading]
  );

  const fetchAssignment = React.useCallback(
    async (assignmentId: string) => {
      if (
        assignmentDataRef.current[assignmentId] ||
        loadingDataRef.current.has(assignmentId) ||
        notFoundAssignmentsRef.current.has(assignmentId)
      ) {
        return;
      }
      markLoading(assignmentId, true);
      try {
        const res = await fetch(`/api/assignments/${assignmentId}`);
        if (res.ok) {
          const data = await res.json();
          setAssignmentData((prev) => ({ ...prev, [assignmentId]: data }));
        } else if (res.status === 404) {
          setNotFoundAssignments((prev) => new Set(prev).add(assignmentId));
        }
      } catch (error) {
        console.error('useQuizAssignmentData: assignment fetch failed', error);
      } finally {
        markLoading(assignmentId, false);
      }
    },
    [markLoading]
  );

  React.useEffect(() => {
    for (const item of content) {
      if (item.type === 'quiz' && item.data?.quizId) {
        fetchQuiz(item.data.quizId);
      } else if (item.type === 'assignment' && item.data?.assignmentId) {
        fetchAssignment(item.data.assignmentId);
      }
    }
  }, [content, fetchQuiz, fetchAssignment]);

  return {
    quizData,
    assignmentData,
    loadingData,
    notFoundQuizzes,
    notFoundAssignments,
  };
}
