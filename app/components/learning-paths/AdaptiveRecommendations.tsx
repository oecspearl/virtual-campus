'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lightbulb,
  BookOpen,
  FileText,
  RefreshCw,
  CheckCircle,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface Recommendation {
  id: string;
  rule_id: string;
  quiz_attempt_id: string;
  recommendation_type: 'recommend_lesson' | 'recommend_resource' | 'recommend_review' | 'send_notification';
  target_id: string | null;
  status: 'pending' | 'viewed' | 'completed' | 'dismissed';
  created_at: string;
  target?: {
    id: string;
    title: string;
    description?: string;
    course_id?: string;
    course?: { title: string };
    resource_type?: string;
  } | null;
  rule?: {
    condition_type: string;
    condition_value: Record<string, unknown>;
    action_type: string;
  };
}

interface AdaptiveRecommendationsProps {
  limit?: number;
  showDismissed?: boolean;
  compact?: boolean;
}

export default function AdaptiveRecommendations({
  limit = 5,
  showDismissed = false,
  compact = false,
}: AdaptiveRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [showDismissed, limit]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const status = showDismissed ? '' : 'pending';
      const response = await fetch(
        `/api/adaptive/recommendations?status=${status}&limit=${limit}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations');
      }

      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (
    recommendationId: string,
    status: 'viewed' | 'completed' | 'dismissed'
  ) => {
    try {
      const response = await fetch('/api/adaptive/recommendations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: recommendationId, status }),
      });

      if (response.ok) {
        setRecommendations((prev) =>
          prev.map((r) =>
            r.id === recommendationId ? { ...r, status } : r
          )
        );
      }
    } catch (err) {
      console.error('Failed to update recommendation status:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'recommend_lesson':
        return <BookOpen className="w-5 h-5" />;
      case 'recommend_resource':
        return <FileText className="w-5 h-5" />;
      case 'recommend_review':
        return <RefreshCw className="w-5 h-5" />;
      default:
        return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'recommend_lesson':
        return 'Recommended Lesson';
      case 'recommend_resource':
        return 'Helpful Resource';
      case 'recommend_review':
        return 'Review Suggestion';
      default:
        return 'Recommendation';
    }
  };

  const getReasonText = (recommendation: Recommendation) => {
    const conditionType = recommendation.rule?.condition_type;
    const conditionValue = recommendation.rule?.condition_value as {
      threshold?: number;
      topics?: string[];
    };

    switch (conditionType) {
      case 'score_below':
        return `Based on your quiz score being below ${conditionValue?.threshold || 70}%`;
      case 'score_above':
        return `You're doing great! Here's something to challenge you further`;
      case 'topic_weak':
        return `To help strengthen your understanding of ${conditionValue?.topics?.join(', ') || 'this topic'}`;
      case 'time_exceeded':
        return 'This might help you work more efficiently';
      default:
        return 'Personalized for your learning journey';
    }
  };

  const getTargetLink = (recommendation: Recommendation) => {
    if (!recommendation.target) return '#';

    switch (recommendation.recommendation_type) {
      case 'recommend_lesson':
        // Lessons are viewed within their course context
        if (recommendation.target.course_id) {
          return `/course/${recommendation.target.course_id}/lesson/${recommendation.target.id}`;
        }
        return '#';
      case 'recommend_resource':
        return `/lecturers/resources/${recommendation.target.id}`;
      default:
        return '#';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  const pendingRecommendations = recommendations.filter(
    (r) => r.status === 'pending' || r.status === 'viewed'
  );

  if (pendingRecommendations.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p>No recommendations right now.</p>
        <p className="text-sm mt-1">Complete a quiz to get personalized suggestions!</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {pendingRecommendations.map((recommendation) => (
          <Link
            key={recommendation.id}
            href={getTargetLink(recommendation)}
            onClick={() => {
              if (recommendation.status === 'pending') {
                updateStatus(recommendation.id, 'viewed');
              }
            }}
            className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
              {getIcon(recommendation.recommendation_type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {recommendation.target?.title || 'Recommendation'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getTypeLabel(recommendation.recommendation_type)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Personalized Recommendations
        </h3>
        <button
          onClick={fetchRecommendations}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Refresh recommendations"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {pendingRecommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onView={() => updateStatus(recommendation.id, 'viewed')}
            onComplete={() => updateStatus(recommendation.id, 'completed')}
            onDismiss={() => updateStatus(recommendation.id, 'dismissed')}
            getIcon={getIcon}
            getTypeLabel={getTypeLabel}
            getReasonText={getReasonText}
            getTargetLink={getTargetLink}
          />
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onView,
  onComplete,
  onDismiss,
  getIcon,
  getTypeLabel,
  getReasonText,
  getTargetLink,
}: {
  recommendation: Recommendation;
  onView: () => void;
  onComplete: () => void;
  onDismiss: () => void;
  getIcon: (type: string) => React.ReactNode;
  getTypeLabel: (type: string) => string;
  getReasonText: (rec: Recommendation) => string;
  getTargetLink: (rec: Recommendation) => string;
}) {
  const isNew = recommendation.status === 'pending';

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl border ${
        isNew
          ? 'border-amber-200 dark:border-amber-800 shadow-sm'
          : 'border-gray-200 dark:border-gray-700'
      } overflow-hidden`}
    >
      {isNew && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
      )}

      <div className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl ${
              isNew
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {getIcon(recommendation.recommendation_type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={`text-xs font-medium ${
                    isNew
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {getTypeLabel(recommendation.recommendation_type)}
                  {isNew && (
                    <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white rounded text-[10px]">
                      NEW
                    </span>
                  )}
                </span>
                <h4 className="font-medium text-gray-900 dark:text-white mt-1">
                  {recommendation.target?.title || 'Review this material'}
                </h4>
              </div>

              <button
                onClick={onDismiss}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {recommendation.target?.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                {recommendation.target.description}
              </p>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
              {getReasonText(recommendation)}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Link
                href={getTargetLink(recommendation)}
                onClick={onView}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View
                <ChevronRight className="w-4 h-4" />
              </Link>
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to generate recommendations after a quiz attempt
 */
export function useGenerateRecommendations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRecommendations = async (quizAttemptId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/adaptive/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_attempt_id: quizAttemptId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recommendations');
      }

      return data.recommendations || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { generateRecommendations, loading, error };
}
