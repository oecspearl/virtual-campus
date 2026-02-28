'use client';

import { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle, ArrowRight, Trophy, FileText } from 'lucide-react';
import Link from 'next/link';

interface PrerequisiteInfo {
  lesson_id: string;
  lesson_title: string;
  course_id?: string;
  type: 'completion' | 'quiz_pass' | 'assignment_pass';
  min_score?: number;
  is_completed?: boolean;
  completed_at?: string;
  quiz_id?: string;
  required_score?: number;
  best_score?: number;
  is_passed?: boolean;
  assignment_id?: string;
  best_grade?: number;
}

interface UnlockStatus {
  is_unlocked: boolean;
  lesson_id: string;
  lesson_title: string;
  prerequisite: PrerequisiteInfo | null;
}

interface PrerequisiteGateProps {
  lessonId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onStatusChange?: (status: UnlockStatus) => void;
}

/**
 * PrerequisiteGate Component
 *
 * Wraps lesson content and blocks access until prerequisites are met.
 * Shows a friendly message with progress towards unlocking.
 */
export default function PrerequisiteGate({
  lessonId,
  children,
  fallback,
  onStatusChange,
}: PrerequisiteGateProps) {
  const [status, setStatus] = useState<UnlockStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkUnlockStatus() {
      try {
        const response = await fetch(`/api/lessons/${lessonId}/unlock-status`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check unlock status');
        }

        setStatus(data);
        onStatusChange?.(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    checkUnlockStatus();
  }, [lessonId, onStatusChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  // Unlocked - render children
  if (status?.is_unlocked) {
    return <>{children}</>;
  }

  // Locked - show prerequisite info or fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default locked state UI
  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Lesson Locked
        </h3>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Complete the prerequisite to unlock this lesson.
        </p>

        {status?.prerequisite && (
          <PrerequisiteProgress prerequisite={status.prerequisite} />
        )}
      </div>
    </div>
  );
}

function PrerequisiteProgress({ prerequisite }: { prerequisite: PrerequisiteInfo }) {
  const getTypeIcon = () => {
    switch (prerequisite.type) {
      case 'quiz_pass':
        return <Trophy className="w-5 h-5" />;
      case 'assignment_pass':
        return <FileText className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getRequirementText = () => {
    switch (prerequisite.type) {
      case 'quiz_pass':
        return `Pass the quiz with ${prerequisite.required_score || prerequisite.min_score || 70}% or higher`;
      case 'assignment_pass':
        return `Complete the assignment with ${prerequisite.required_score || prerequisite.min_score || 70}% or higher`;
      default:
        return 'Complete the lesson';
    }
  };

  const getProgressText = () => {
    if (prerequisite.type === 'completion') {
      if (prerequisite.is_completed) {
        return 'Completed';
      }
      return 'Not started';
    }

    if (prerequisite.type === 'quiz_pass') {
      if (prerequisite.best_score !== undefined) {
        const required = prerequisite.required_score || prerequisite.min_score || 70;
        if (prerequisite.best_score >= required) {
          return `Passed with ${prerequisite.best_score}%`;
        }
        return `Best score: ${prerequisite.best_score}% (need ${required}%)`;
      }
      return 'Not attempted';
    }

    if (prerequisite.type === 'assignment_pass') {
      if (prerequisite.best_grade !== undefined) {
        const required = prerequisite.required_score || prerequisite.min_score || 70;
        if (prerequisite.best_grade >= required) {
          return `Passed with ${prerequisite.best_grade}%`;
        }
        return `Best grade: ${prerequisite.best_grade}% (need ${required}%)`;
      }
      return 'Not submitted';
    }

    return '';
  };

  const getProgressPercentage = () => {
    if (prerequisite.type === 'completion') {
      return prerequisite.is_completed ? 100 : 0;
    }

    const score = prerequisite.best_score ?? prerequisite.best_grade ?? 0;
    const required = prerequisite.required_score || prerequisite.min_score || 70;
    return Math.min((score / required) * 100, 100);
  };

  const progress = getProgressPercentage();

  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-left border border-gray-200 dark:border-gray-600">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${
          progress >= 100
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
        }`}>
          {getTypeIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {prerequisite.lesson_title}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {getRequirementText()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-300">Progress</span>
          <span className={progress >= 100 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}>
            {getProgressText()}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Action button */}
      <Link
        href={prerequisite.course_id
          ? `/course/${prerequisite.course_id}/lesson/${prerequisite.lesson_id}`
          : '#'
        }
        className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        {progress >= 100 ? 'View Lesson' : 'Go to Prerequisite'}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Link>
    </div>
  );
}

/**
 * Hook to check if a lesson is unlocked
 */
export function useLessonUnlockStatus(lessonId: string) {
  const [status, setStatus] = useState<UnlockStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch(`/api/lessons/${lessonId}/unlock-status`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check unlock status');
        }

        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [lessonId]);

  return { status, loading, error, isUnlocked: status?.is_unlocked ?? false };
}
