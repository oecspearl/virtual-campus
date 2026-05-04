'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { ResponsiveTable } from '@/app/components/ui/ResponsiveTable';
import Link from 'next/link';

interface AtRiskStudent {
  student_id: string;
  course_id?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  risk_factors: {
    low_engagement: boolean;
    poor_performance: boolean;
    missing_assignments: boolean;
    low_attendance: boolean;
    late_submissions: boolean;
    declining_trend: boolean;
  };
  engagement_score: number;
  performance_score: number;
  attendance_rate: number;
  predicted_grade?: string;
  confidence: number;
  student_name?: string;
  course_name?: string;
}

export default function AtRiskStudentsPage() {
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('');
  const [filterCourse, setFilterCourse] = useState<string>('');
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    loadAtRiskStudents();
    loadCourses();
  }, [filterRiskLevel, filterCourse]);

  const loadAtRiskStudents = async () => {
    try {
      setLoading(true);
      let url = '/api/analytics/at-risk?';
      if (filterRiskLevel) url += `risk_level=${filterRiskLevel}&`;
      if (filterCourse) url += `course_id=${filterCourse}&`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        // Fetch student and course names
        const enriched = await Promise.all(
          data.map(async (student: AtRiskStudent) => {
            const studentRes = await fetch(`/api/users/${student.student_id}`);
            const courseRes = student.course_id 
              ? await fetch(`/api/courses/${student.course_id}`)
              : null;
            
            const studentData = studentRes.ok ? await studentRes.json() : null;
            const courseData = courseRes?.ok ? await courseRes.json() : null;
            
            return {
              ...student,
              student_name: studentData?.name || studentData?.email || 'Unknown',
              course_name: courseData?.title || 'All Courses',
            };
          })
        );
        
        setStudents(enriched);
      }
    } catch (error) {
      console.error('Failed to load at-risk students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      if (response.ok) {
        const data = await response.json();
        // The API returns { courses: [...], userRole, accessType }
        // Extract the courses array
        const coursesList = data.courses || (Array.isArray(data) ? data : []);
        setCourses(Array.isArray(coursesList) ? coursesList : []);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]); // Set empty array on error
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical': return 'material-symbols:warning';
      case 'high': return 'material-symbols:error';
      case 'medium': return 'material-symbols:info';
      case 'low': return 'material-symbols:check-circle';
      default: return 'material-symbols:help';
    }
  };

  const recalculateRisk = async (studentId: string, courseId?: string) => {
    try {
      const response = await fetch('/api/analytics/at-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, course_id: courseId }),
      });
      
      if (response.ok) {
        await loadAtRiskStudents();
      }
    } catch (error) {
      console.error('Failed to recalculate risk:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-normal text-slate-900 tracking-tight">At-Risk Students</h1>
        <p className="mt-2 text-sm text-gray-600">
          Students identified as at risk of failing based on engagement and performance metrics
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Risk Level
            </label>
            <select
              value={filterRiskLevel}
              onChange={(e) => setFilterRiskLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course
            </label>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Courses</option>
              {Array.isArray(courses) && courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={loadAtRiskStudents}
              variant="outline"
              className="w-full"
            >
              <Icon icon="material-symbols:refresh" className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {!loading && students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {students.filter(s => s.risk_level === 'critical').length}
                </p>
              </div>
              <Icon icon="material-symbols:warning" className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-2xl font-bold text-orange-600">
                  {students.filter(s => s.risk_level === 'high').length}
                </p>
              </div>
              <Icon icon="material-symbols:error" className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Medium Risk</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {students.filter(s => s.risk_level === 'medium').length}
                </p>
              </div>
              <Icon icon="material-symbols:info" className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total At-Risk</p>
                <p className="text-2xl font-bold text-gray-900">
                  {students.length}
                </p>
              </div>
              <Icon icon="material-symbols:people" className="w-8 h-8 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* Students List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <ResponsiveTable<AtRiskStudent>
          caption="At-risk students"
          rows={students}
          rowKey={(s) => `${s.student_id}-${s.course_id || 'all'}`}
          empty={
            <div className="flex flex-col items-center">
              <Icon icon="material-symbols:check-circle" className="w-16 h-16 text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No At-Risk Students</h3>
              <p className="text-gray-600">All students are performing well!</p>
            </div>
          }
          columns={[
            {
              key: 'student',
              header: 'Student',
              primary: true,
              render: (s) => (
                <>
                  <div className="text-sm font-medium text-gray-900">{s.student_name}</div>
                  <div className="text-sm text-gray-500 font-mono">{s.student_id.substring(0, 8)}…</div>
                </>
              ),
            },
            {
              key: 'course',
              header: 'Course',
              render: (s) => <span className="text-sm text-gray-500">{s.course_name}</span>,
            },
            {
              key: 'risk_level',
              header: 'Risk Level',
              render: (s) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskColor(s.risk_level)}`}>
                  <Icon icon={getRiskIcon(s.risk_level)} className="w-4 h-4 mr-1" />
                  {s.risk_level.toUpperCase()}
                </span>
              ),
            },
            {
              key: 'risk_score',
              header: 'Risk Score',
              render: (s) => (
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2 flex-shrink-0">
                    <div
                      className={`h-2 rounded-full ${
                        s.risk_score >= 70 ? 'bg-red-600' :
                        s.risk_score >= 50 ? 'bg-orange-600' :
                        s.risk_score >= 30 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${s.risk_score}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">{s.risk_score}%</span>
                </div>
              ),
            },
            {
              key: 'metrics',
              header: 'Metrics',
              render: (s) => (
                <div className="space-y-1 text-sm text-gray-500">
                  <div>Engagement: {s.engagement_score.toFixed(0)}%</div>
                  <div>Performance: {s.performance_score.toFixed(0)}%</div>
                  <div>Attendance: {s.attendance_rate.toFixed(0)}%</div>
                </div>
              ),
            },
            {
              key: 'predicted_grade',
              header: 'Predicted Grade',
              render: (s) => (
                <>
                  <span className="text-sm font-medium text-gray-900">{s.predicted_grade || 'N/A'}</span>
                  <div className="text-xs text-gray-500">{s.confidence}% confidence</div>
                </>
              ),
            },
          ]}
          actions={(s) => (
            <>
              <Link
                href={`/admin/students/${s.student_id}`}
                className="inline-flex items-center justify-center min-h-[44px] px-3 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded text-sm"
              >
                View
              </Link>
              <button
                onClick={() => recalculateRisk(s.student_id, s.course_id)}
                aria-label="Recalculate risk"
                title="Recalculate risk"
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
              >
                <Icon icon="material-symbols:refresh" className="w-4 h-4" />
              </button>
            </>
          )}
        />
      )}

      {/* Risk Factors Legend */}
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Risk Factors</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div className="flex items-center">
            <Icon icon="material-symbols:trending-down" className="w-4 h-4 text-red-500 mr-2" />
            <span>Low Engagement</span>
          </div>
          <div className="flex items-center">
            <Icon icon="material-symbols:grade" className="w-4 h-4 text-orange-500 mr-2" />
            <span>Poor Performance</span>
          </div>
          <div className="flex items-center">
            <Icon icon="material-symbols:assignment" className="w-4 h-4 text-yellow-500 mr-2" />
            <span>Missing Assignments</span>
          </div>
          <div className="flex items-center">
            <Icon icon="material-symbols:event-busy" className="w-4 h-4 text-red-500 mr-2" />
            <span>Low Attendance</span>
          </div>
          <div className="flex items-center">
            <Icon icon="material-symbols:schedule" className="w-4 h-4 text-orange-500 mr-2" />
            <span>Late Submissions</span>
          </div>
          <div className="flex items-center">
            <Icon icon="material-symbols:show-chart" className="w-4 h-4 text-yellow-500 mr-2" />
            <span>Declining Trend</span>
          </div>
        </div>
      </div>
    </div>
  );
}

