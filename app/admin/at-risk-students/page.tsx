'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
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
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Icon icon="material-symbols:check-circle" className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No At-Risk Students</h3>
          <p className="text-gray-600">All students are performing well!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metrics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Predicted Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={`${student.student_id}-${student.course_id || 'all'}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.student_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.student_id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.course_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskColor(student.risk_level)}`}>
                      <Icon icon={getRiskIcon(student.risk_level)} className="w-4 h-4 mr-1" />
                      {student.risk_level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            student.risk_score >= 70 ? 'bg-red-600' :
                            student.risk_score >= 50 ? 'bg-orange-600' :
                            student.risk_score >= 30 ? 'bg-yellow-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${student.risk_score}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">{student.risk_score}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div>Engagement: {student.engagement_score.toFixed(0)}%</div>
                      <div>Performance: {student.performance_score.toFixed(0)}%</div>
                      <div>Attendance: {student.attendance_rate.toFixed(0)}%</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {student.predicted_grade || 'N/A'}
                    </span>
                    <div className="text-xs text-gray-500">
                      {student.confidence}% confidence
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/students/${student.student_id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => recalculateRisk(student.student_id, student.course_id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Recalculate Risk"
                      >
                        <Icon icon="material-symbols:refresh" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

