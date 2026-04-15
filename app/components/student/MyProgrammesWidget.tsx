'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';

interface Programme {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  difficulty?: string;
  estimated_duration?: string;
  passing_score: number;
  course_count: number;
  required_count: number;
}

interface ProgrammeEnrollment {
  id: string;
  status: string;
  enrolled_at: string;
  final_score?: number;
  completed_at?: string;
  programme: Programme;
  progress: {
    completed_courses: number;
    total_courses: number;
    overall_progress: number;
  };
}

export default function MyProgrammesWidget() {
  const { supabase } = useSupabase();
  const [programmes, setProgrammes] = useState<ProgrammeEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
  }, [supabase]);

  const loadProgrammes = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/student/programmes', { headers });
      if (res.ok) {
        const data = await res.json();
        setProgrammes(data.programmes || []);
      }
    } catch (error) {
      console.error('Error loading programmes:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadProgrammes();
  }, [loadProgrammes]);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Icon icon="material-symbols:school" className="w-5 h-5 mr-2" />
            My Programmes
          </h3>
          <p className="text-purple-100 text-sm">Your enrolled learning programmes</p>
        </div>
        <div className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (programmes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Icon icon="material-symbols:school" className="w-5 h-5 mr-2" />
            My Programmes
          </h3>
          <p className="text-purple-100 text-sm">Your enrolled learning programmes</p>
        </div>
        <div className="p-6 text-center">
          <Icon icon="material-symbols:school-outline" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">You haven't enrolled in any programmes yet.</p>
          <Link
            href="/programmes"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Icon icon="material-symbols:explore" className="w-4 h-4" />
            Browse Programmes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center">
              <Icon icon="material-symbols:school" className="w-5 h-5 mr-2" />
              My Programmes
            </h3>
            <p className="text-purple-100 text-sm">Your enrolled learning programmes</p>
          </div>
          <Link
            href="/programmes"
            className="text-white/80 hover:text-white text-sm flex items-center gap-1"
          >
            View All
            <Icon icon="material-symbols:arrow-forward" className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="space-y-4">
          {programmes.slice(0, 3).map((enrollment) => (
            <Link
              key={enrollment.id}
              href={`/programmes/${enrollment.programme.id}`}
              className="block p-4 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors border border-gray-100 hover:border-purple-200"
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {enrollment.programme.thumbnail ? (
                    <img
                      src={enrollment.programme.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon icon="material-symbols:school" className="w-8 h-8 text-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {enrollment.programme.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <span>{enrollment.progress.completed_courses}/{enrollment.progress.total_courses} courses</span>
                    {enrollment.programme.difficulty && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getDifficultyColor(enrollment.programme.difficulty)}`}>
                        {enrollment.programme.difficulty}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{enrollment.progress.overall_progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          enrollment.progress.overall_progress >= 100
                            ? 'bg-green-500'
                            : 'bg-purple-500'
                        }`}
                        style={{ width: `${Math.min(enrollment.progress.overall_progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Score if available */}
                  {enrollment.final_score !== null && enrollment.final_score !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-gray-500">Current Score:</span>
                      <span className={`text-sm font-semibold ${
                        enrollment.final_score >= enrollment.programme.passing_score
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}>
                        {enrollment.final_score.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-400">
                        (Pass: {enrollment.programme.passing_score}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {programmes.length > 3 && (
          <div className="mt-4 text-center">
            <Link
              href="/programmes"
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
            >
              View all {programmes.length} programmes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
