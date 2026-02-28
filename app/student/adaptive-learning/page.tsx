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
  rule?: {
    condition_type: string;
    condition_value: any;
  };
  target?: {
    id: string;
    title: string;
    course_id?: string;
    course?: { title: string };
  };
}

interface Competency {
  id: string;
  name: string;
  description?: string;
  category?: string;
  current_level: number;
  evidence?: any[];
  last_updated?: string;
}

interface CompetencyStats {
  total_competencies: number;
  acquired_competencies: number;
  mastered_competencies: number;
  average_level: number;
}

export default function AdaptiveLearningPage() {
  const { supabase, user } = useSupabase();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [stats, setStats] = useState<CompetencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'competencies'>('recommendations');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch recommendations
      const recRes = await fetch('/api/adaptive/recommendations?status=pending&limit=20', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (recRes.ok) {
        const recData = await recRes.json();
        setRecommendations(recData.recommendations || []);
      }

      // Fetch competencies
      const compRes = await fetch('/api/competencies/student', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (compRes.ok) {
        const compData = await compRes.json();
        setCompetencies(compData.competencies || []);
        setStats(compData.stats || null);
      }

    } catch (err) {
      console.error('Error fetching adaptive data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRecommendationStatus = async (recId: string, status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/adaptive/recommendations', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recommendation_id: recId, status }),
      });

      if (res.ok) {
        setRecommendations(prev =>
          prev.map(r => r.id === recId ? { ...r, status } : r)
        );
      }
    } catch (err) {
      console.error('Error updating recommendation:', err);
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'recommend_lesson': return 'material-symbols:school';
      case 'recommend_resource': return 'material-symbols:library-books';
      case 'recommend_review': return 'material-symbols:replay';
      case 'send_notification': return 'material-symbols:notifications';
      default: return 'material-symbols:lightbulb';
    }
  };

  const getRecommendationLabel = (type: string) => {
    switch (type) {
      case 'recommend_lesson': return 'Recommended Lesson';
      case 'recommend_resource': return 'Recommended Resource';
      case 'recommend_review': return 'Review Recommended';
      case 'send_notification': return 'Learning Tip';
      default: return 'Recommendation';
    }
  };

  const getConditionExplanation = (rule?: { condition_type: string; condition_value: any }) => {
    if (!rule) return '';
    const { condition_type, condition_value } = rule;
    switch (condition_type) {
      case 'score_below':
        return `Based on scoring below ${condition_value?.threshold || 70}%`;
      case 'score_above':
        return `Based on excellent performance (above ${condition_value?.threshold || 70}%)`;
      case 'topic_weak':
        return `To strengthen skills in: ${condition_value?.topics?.join(', ') || 'related topics'}`;
      case 'time_exceeded':
        return 'Based on time taken to complete the quiz';
      default:
        return 'Based on your quiz performance';
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 4) return 'text-green-600 bg-green-100';
    if (level >= 3) return 'text-blue-600 bg-blue-100';
    if (level >= 2) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getLevelLabel = (level: number) => {
    if (level >= 4.5) return 'Expert';
    if (level >= 3.5) return 'Proficient';
    if (level >= 2.5) return 'Competent';
    if (level >= 1.5) return 'Developing';
    return 'Beginner';
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Icon icon="material-symbols:login" className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800">Please sign in</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            <Icon icon="material-symbols:arrow-back" className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Adaptive Learning</h1>
        </div>
        <p className="text-gray-600">Personalized recommendations and skill progress based on your performance</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icon icon="material-symbols:psychology" className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total_competencies}</div>
                <div className="text-sm text-gray-500">Total Skills</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Icon icon="material-symbols:check-circle" className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.acquired_competencies}</div>
                <div className="text-sm text-gray-500">Acquired</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Icon icon="material-symbols:star" className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.mastered_competencies}</div>
                <div className="text-sm text-gray-500">Mastered</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Icon icon="material-symbols:trending-up" className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.average_level.toFixed(1)}</div>
                <div className="text-sm text-gray-500">Avg Level</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'recommendations'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon icon="material-symbols:lightbulb" className="w-5 h-5" />
            Recommendations
            {recommendations.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {recommendations.filter(r => r.status === 'pending').length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('competencies')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'competencies'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon icon="material-symbols:psychology" className="w-5 h-5" />
            My Skills
          </span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : activeTab === 'recommendations' ? (
        /* Recommendations Tab */
        recommendations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Icon icon="material-symbols:check-circle" className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">All caught up!</h3>
            <p className="text-gray-500">No personalized recommendations at the moment. Keep learning!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map(rec => (
              <div
                key={rec.id}
                className={`bg-white rounded-xl border p-6 transition-all ${
                  rec.status === 'pending' ? 'border-blue-300 shadow-sm' : 'border-gray-200 opacity-75'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    rec.status === 'pending' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Icon
                      icon={getRecommendationIcon(rec.recommendation_type)}
                      className={`w-6 h-6 ${rec.status === 'pending' ? 'text-blue-600' : 'text-gray-400'}`}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {getRecommendationLabel(rec.recommendation_type)}
                      </span>
                      {rec.status !== 'pending' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                          {rec.status}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {rec.target?.title || 'Learning Recommendation'}
                    </h3>

                    <p className="text-sm text-gray-600 mb-3">
                      {getConditionExplanation(rec.rule)}
                    </p>

                    {rec.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        {rec.recommendation_type === 'recommend_lesson' && rec.target?.course_id && (
                          <Link
                            href={`/course/${rec.target.course_id}/lesson/${rec.target_id}`}
                            onClick={() => updateRecommendationStatus(rec.id, 'viewed')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                          >
                            <Icon icon="material-symbols:play-arrow" className="w-5 h-5" />
                            Start Lesson
                          </Link>
                        )}
                        <button
                          onClick={() => updateRecommendationStatus(rec.id, 'dismissed')}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-400">
                    {new Date(rec.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Competencies Tab */
        competencies.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Icon icon="material-symbols:psychology-outline" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No skills tracked yet</h3>
            <p className="text-gray-500">Complete quizzes and assignments to build your skill profile</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competencies.map(comp => (
              <div
                key={comp.id}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {comp.name || 'Skill'}
                    </h3>
                    {comp.category && (
                      <span className="text-xs text-gray-500">{comp.category}</span>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-sm font-medium ${getLevelColor(comp.current_level)}`}>
                    {getLevelLabel(comp.current_level)}
                  </span>
                </div>

                {comp.description && (
                  <p className="text-sm text-gray-600 mb-3">{comp.description}</p>
                )}

                {/* Progress bar */}
                <div className="relative">
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${(comp.current_level / 5) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>Level {comp.current_level.toFixed(1)}</span>
                    <span>Max: 5.0</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
