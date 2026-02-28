'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';

interface Recommendation {
  id: string;
  recommendation_type: string;
  target_id: string;
  status: string;
  created_at: string;
  target?: {
    id: string;
    title: string;
    course_id?: string;
  };
}

interface CompetencyStats {
  total_competencies: number;
  acquired_competencies: number;
  mastered_competencies: number;
  average_level: number;
}

export default function AdaptiveLearningWidget() {
  const { supabase, user } = useSupabase();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState<CompetencyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch pending recommendations
      const recRes = await fetch('/api/adaptive/recommendations?status=pending&limit=3', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (recRes.ok) {
        const recData = await recRes.json();
        setRecommendations(recData.recommendations || []);
      }

      // Fetch competency stats
      const compRes = await fetch('/api/competencies/student', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (compRes.ok) {
        const compData = await compRes.json();
        setStats(compData.stats || null);
      }
    } catch (err) {
      console.error('Error fetching adaptive data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'recommend_lesson': return 'material-symbols:school';
      case 'recommend_resource': return 'material-symbols:library-books';
      case 'recommend_review': return 'material-symbols:replay';
      default: return 'material-symbols:lightbulb';
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center">
              <Icon icon="material-symbols:psychology" className="w-5 h-5 mr-2" />
              Adaptive Learning
            </h3>
            <p className="text-purple-100 text-sm">Personalized recommendations</p>
          </div>
          <Link
            href="/student/adaptive-learning"
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="material-symbols:arrow-forward" className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            {stats && stats.total_competencies > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-700">{stats.acquired_competencies}</div>
                  <div className="text-xs text-purple-600">Skills Acquired</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-indigo-700">{stats.average_level.toFixed(1)}</div>
                  <div className="text-xs text-indigo-600">Avg Level</div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">For You</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                    {recommendations.length} new
                  </span>
                </div>
                {recommendations.map(rec => (
                  <Link
                    key={rec.id}
                    href={
                      rec.recommendation_type === 'recommend_lesson' && rec.target?.course_id
                        ? `/course/${rec.target.course_id}/lesson/${rec.target_id}`
                        : '/student/adaptive-learning'
                    }
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                      <Icon
                        icon={getRecommendationIcon(rec.recommendation_type)}
                        className="w-4 h-4 text-purple-600"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {rec.target?.title || 'Learning Recommendation'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {rec.recommendation_type === 'recommend_lesson' ? 'Recommended lesson' : 'Based on your performance'}
                      </div>
                    </div>
                    <Icon icon="material-symbols:chevron-right" className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Icon icon="material-symbols:check-circle" className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">All caught up! Keep learning.</p>
              </div>
            )}

            {/* View All Link */}
            <Link
              href="/student/adaptive-learning"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View All Insights
              <Icon icon="material-symbols:arrow-forward" className="w-4 h-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
