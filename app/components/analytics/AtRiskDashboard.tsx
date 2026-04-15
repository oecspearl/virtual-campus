"use client";

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';
import { hasRole } from '@/lib/rbac';

interface RiskScore {
  student_id: string;
  course_id?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  factors: any;
  calculated_at: Date;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
}

export default function AtRiskDashboard({ courseId }: { courseId?: string }) {
  const { user } = useSupabase();
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [students, setStudents] = useState<Map<string, StudentInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'medium' | 'high' | 'critical' | 'all'>('all');

  useEffect(() => {
    if (user) {
      loadRiskScores();
    }
  }, [user, courseId, selectedRiskLevel]);

  const loadRiskScores = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      if (selectedRiskLevel !== 'all') {
        params.append('risk_level', selectedRiskLevel);
      }

      const response = await fetch(`/api/analytics/risk-scores?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        setRiskScores(result.data || []);

        // Load student information
        const studentIds = [...new Set(result.data?.map((r: RiskScore) => r.student_id) || [])];
        if (studentIds.length > 0) {
          const studentResponse = await fetch('/api/users/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_ids: studentIds }),
          });

          if (studentResponse.ok) {
            const studentData = await studentResponse.json();
            const studentMap = new Map<string, StudentInfo>();
            studentData.data?.forEach((s: StudentInfo) => {
              studentMap.set(s.id, s);
            });
            setStudents(studentMap);
          }
        }
      }
    } catch (error) {
      console.error('Error loading risk scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return 'material-symbols:warning';
      case 'high':
        return 'material-symbols:error';
      case 'medium':
        return 'material-symbols:info';
      default:
        return 'material-symbols:check-circle';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">At-Risk Students</h2>
          <p className="text-gray-600 mt-1">Monitor students who may need additional support</p>
        </div>
        <button
          onClick={loadRiskScores}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Icon icon="material-symbols:refresh" className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedRiskLevel('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedRiskLevel === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setSelectedRiskLevel('critical')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedRiskLevel === 'critical'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Critical
        </button>
        <button
          onClick={() => setSelectedRiskLevel('high')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedRiskLevel === 'high'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          High
        </button>
        <button
          onClick={() => setSelectedRiskLevel('medium')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedRiskLevel === 'medium'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Medium
        </button>
      </div>

      {/* Risk Scores List */}
      {riskScores.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Icon icon="material-symbols:check-circle" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No at-risk students found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {riskScores.map((risk) => {
            const student = students.get(risk.student_id);
            return (
              <div
                key={`${risk.student_id}-${risk.course_id || 'all'}`}
                className={`border-2 rounded-lg p-6 ${getRiskColor(risk.risk_level)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon
                        icon={getRiskIcon(risk.risk_level)}
                        className="w-6 h-6"
                      />
                      <h3 className="text-lg font-semibold">
                        {student?.name || 'Unknown Student'}
                      </h3>
                      <span className="px-3 py-1 bg-white/50 rounded-full text-sm font-medium">
                        {risk.risk_score.toFixed(1)}% Risk
                      </span>
                    </div>
                    {student?.email && (
                      <p className="text-sm opacity-80 mb-3">{student.email}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs opacity-70 mb-1">Submission Rate</p>
                        <p className="font-semibold">
                          {risk.factors?.assignment_submission_rate?.toFixed(1) || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs opacity-70 mb-1">Quiz Score</p>
                        <p className="font-semibold">
                          {risk.factors?.average_quiz_score?.toFixed(1) || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs opacity-70 mb-1">Missing Assignments</p>
                        <p className="font-semibold">
                          {risk.factors?.missing_assignments_count || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs opacity-70 mb-1">Last Activity</p>
                        <p className="font-semibold">
                          {risk.factors?.last_activity_days_ago || 0} days ago
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-current/20">
                  <p className="text-xs opacity-70">
                    Calculated: {new Date(risk.calculated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


