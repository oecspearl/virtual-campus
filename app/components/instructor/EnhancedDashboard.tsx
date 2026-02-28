"use client";

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';
import AtRiskDashboard from '@/app/components/analytics/AtRiskDashboard';
import EngagementMetrics from '@/app/components/analytics/EngagementMetrics';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CourseStats {
  course: { id: string; title: string };
  students: {
    total: number;
    active: number;
    average_progress: number;
    at_risk: number;
  };
  assignments: {
    total: number;
    submissions: number;
    graded: number;
    late: number;
    completion_rate: number;
  };
  quizzes: {
    total: number;
    attempts: number;
    average_score: number;
  };
  lessons: {
    completed: number;
    total_progress_records: number;
  };
}

export default function EnhancedDashboard({ courseId }: { courseId?: string }) {
  const { user } = useSupabase();
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && courseId) {
      loadStats();
    }
  }, [user, courseId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/course-stats?course_id=${courseId}`);
      const result = await response.json();

      if (response.ok) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>No data available</div>;
  }

  const pieData = [
    { name: 'Active', value: stats.students.active, color: '#10b981' },
    { name: 'At Risk', value: stats.students.at_risk, color: '#ef4444' },
  ];

  const assignmentData = [
    { name: 'Submitted', value: stats.assignments.submissions, color: '#3b82f6' },
    { name: 'Graded', value: stats.assignments.graded, color: '#10b981' },
    { name: 'Late', value: stats.assignments.late, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.students.total}</p>
            </div>
            <Icon icon="material-symbols:people" className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.students.average_progress.toFixed(1)}%</p>
            </div>
            <Icon icon="material-symbols:trending-up" className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.assignments.total}</p>
            </div>
            <Icon icon="material-symbols:assignment" className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Quiz Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.quizzes.average_score.toFixed(1)}%</p>
            </div>
            <Icon icon="material-symbols:quiz" className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={assignmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6">
                {assignmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* At-Risk Students */}
      {courseId && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <AtRiskDashboard courseId={courseId} />
        </div>
      )}
    </div>
  );
}


