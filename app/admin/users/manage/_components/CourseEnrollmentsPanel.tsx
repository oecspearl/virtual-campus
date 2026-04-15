'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';

interface Course { id: string; title: string; description: string; published: boolean; }
interface Enrollment { id: string; course_id: string; student_id: string; status: string; enrolled_at: string; courses: Course; }
interface User { id: string; email: string; name: string; role: string; }

interface CourseEnrollmentsPanelProps {
  enrollments: Enrollment[];
  users: User[];
  onUnenroll: (enrollmentId: string, userName: string, courseTitle: string) => void;
}

export default function CourseEnrollmentsPanel({ enrollments, users, onUnenroll }: CourseEnrollmentsPanelProps) {
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  const toggle = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) { next.delete(courseId); } else { next.add(courseId); }
      return next;
    });
  };

  // Group enrollments by course
  const byCourse = React.useMemo(() => {
    const grouped: Record<string, { course: Course; enrollments: Enrollment[] }> = {};
    enrollments.forEach(e => {
      if (e.courses) {
        if (!grouped[e.course_id]) grouped[e.course_id] = { course: e.courses, enrollments: [] };
        grouped[e.course_id].enrollments.push(e);
      }
    });
    return grouped;
  }, [enrollments]);

  if (enrollments.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon icon="material-symbols:school" className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Course Enrollments ({enrollments.length})
            </h2>
          </div>
          <span className="text-sm text-gray-500">{Object.keys(byCourse).length} courses</span>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {Object.entries(byCourse).map(([courseId, data]) => {
          const isExpanded = expandedCourses.has(courseId);
          return (
            <div key={courseId} className="bg-white">
              <button onClick={() => toggle(courseId)} className="w-full px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                      <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon icon="material-symbols:menu-book" className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">{data.course.title}</h3>
                      <p className="text-sm text-gray-500">
                        {data.enrollments.length} student{data.enrollments.length !== 1 ? 's' : ''} enrolled
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    data.course.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {data.course.published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-4">
                  <div className="ml-8 border-l-2 border-gray-200 pl-4">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase">
                          <th className="text-left py-2 pr-4">Student</th>
                          <th className="text-left py-2 pr-4">Email</th>
                          <th className="text-left py-2 pr-4">Status</th>
                          <th className="text-left py-2 pr-4">Enrolled</th>
                          <th className="text-left py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.enrollments.map((enrollment) => {
                          const student = users.find(u => u.id === enrollment.student_id);
                          return (
                            <tr key={enrollment.id} className="text-sm">
                              <td className="py-2 pr-4 font-medium text-gray-900">{student?.name || 'Unknown User'}</td>
                              <td className="py-2 pr-4 text-gray-500">{student?.email || '-'}</td>
                              <td className="py-2 pr-4">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  enrollment.status === 'active' ? 'bg-green-100 text-green-700'
                                    : enrollment.status === 'dropped' ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>{enrollment.status}</span>
                              </td>
                              <td className="py-2 pr-4 text-gray-500">{new Date(enrollment.enrolled_at).toLocaleDateString()}</td>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/admin/users/${enrollment.student_id}/activity`}
                                    className="inline-flex items-center text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 text-xs px-2 py-1 rounded-md font-medium transition-colors"
                                  >
                                    <Icon icon="material-symbols:history" className="w-3 h-3 mr-1" /> Activity
                                  </Link>
                                  <Button
                                    onClick={() => onUnenroll(enrollment.id, student?.name || 'Unknown User', data.course.title)}
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 text-xs px-2 py-1"
                                  >
                                    <Icon icon="material-symbols:person-remove" className="w-3 h-3 mr-1" /> Unenroll
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
