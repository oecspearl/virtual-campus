'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { stripHtml } from '@/lib/utils';

interface Course { id: string; title: string; description: string; published: boolean; }
interface Enrollment { id: string; course_id: string; student_id: string; status: string; enrolled_at: string; courses: Course; }
interface User {
  id: string; email: string; name: string; role: string;
  created_at: string; updated_at: string; last_login: string | null; school_id: string | null;
}

interface ByCourseViewProps {
  usersByCourse: Record<string, { course: Course; users: User[]; enrollments: Enrollment[] }>;
  usersWithoutCourse: User[];
  searchQuery: string;
  selectedCourseFilter: string;
  onEditProfile: (userId: string) => void;
  onUnenroll: (enrollmentId: string, userName: string, courseTitle: string) => void;
  onEnrollUser: (user: User) => void;
}

function RoleBadge({ role }: { role: string }) {
  const cls = role === 'admin' || role === 'super_admin'
    ? 'bg-red-100 text-red-800'
    : role === 'instructor' || role === 'curriculum_designer'
    ? 'bg-blue-100 text-blue-800'
    : 'bg-green-100 text-green-800';
  return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>{role.replace('_', ' ')}</span>;
}

export default function ByCourseView({
  usersByCourse, usersWithoutCourse, searchQuery, selectedCourseFilter,
  onEditProfile, onUnenroll, onEnrollUser,
}: ByCourseViewProps) {
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  const toggle = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) { next.delete(courseId); } else { next.add(courseId); }
      return next;
    });
  };

  if (Object.keys(usersByCourse).length === 0 && !selectedCourseFilter) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Icon icon="material-symbols:school-outline" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Course Enrollments</h3>
        <p className="text-gray-600">No users are enrolled in any courses yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(usersByCourse).map(([courseId, data]) => {
        let courseUsers = data.users;
        if (searchQuery) {
          courseUsers = courseUsers.filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        if (courseUsers.length === 0) return null;

        const isExpanded = expandedCourses.has(courseId);

        return (
          <div key={courseId} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <button onClick={() => toggle(courseId)}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                    <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon icon="material-symbols:school" className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{data.course.title}</h3>
                    <p className="text-sm text-gray-600 truncate">{stripHtml(data.course.description || '') || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{courseUsers.length} {courseUsers.length === 1 ? 'student' : 'students'}</div>
                    <div className="text-xs text-gray-500">Click to {isExpanded ? 'collapse' : 'expand'}</div>
                  </div>
                  <Icon icon={isExpanded ? "material-symbols:expand-less" : "material-symbols:expand-more"} className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courseUsers.map((user) => {
                      const enrollment = data.enrollments.find(e => e.student_id === user.id);
                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><RoleBadge role={user.role} /></td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              enrollment?.status === 'active' ? 'bg-green-100 text-green-800'
                                : enrollment?.status === 'dropped' ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>{enrollment?.status || 'unknown'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {enrollment ? new Date(enrollment.enrolled_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_login ? (
                              <span title={new Date(user.last_login).toLocaleString()}>{new Date(user.last_login).toLocaleDateString()}</span>
                            ) : <span className="text-gray-400 italic">Never</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <Button onClick={() => onEditProfile(user.id)} variant="outline"
                                className="text-blue-600 hover:text-blue-900 border-blue-300 text-xs px-3 py-1 flex items-center gap-1">
                                <Icon icon="material-symbols:person" className="w-4 h-4" /> Profile
                              </Button>
                              <a href={`/admin/users/${user.id}/activity`}
                                className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-600 hover:text-purple-900 border border-purple-300 rounded-lg transition-colors">
                                <Icon icon="material-symbols:history" className="w-4 h-4 mr-1" /> Activity
                              </a>
                              {enrollment && (
                                <Button onClick={() => onUnenroll(enrollment.id, user.name, data.course.title)} variant="outline"
                                  className="text-red-600 hover:text-red-900 border-red-300 text-xs px-3 py-1 flex items-center gap-1">
                                  <Icon icon="material-symbols:person-remove" className="w-4 h-4" /> Unenroll
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Users Not Enrolled */}
      {usersWithoutCourse.length > 0 && !selectedCourseFilter && (() => {
        const isExpanded = expandedCourses.has('unenrolled');
        return (
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <button onClick={() => toggle('unenrolled')}
              className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                    <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon icon="material-symbols:person-remove" className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">Not Enrolled in Any Course</h3>
                    <p className="text-sm text-gray-600">Users who are not currently enrolled in any course</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{usersWithoutCourse.length} {usersWithoutCourse.length === 1 ? 'user' : 'users'}</div>
                    <div className="text-xs text-gray-500">Click to {isExpanded ? 'collapse' : 'expand'}</div>
                  </div>
                  <Icon icon={isExpanded ? "material-symbols:expand-less" : "material-symbols:expand-more"} className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usersWithoutCourse.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><RoleBadge role={user.role} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login ? (
                            <span title={new Date(user.last_login).toLocaleString()}>{new Date(user.last_login).toLocaleDateString()}</span>
                          ) : <span className="text-gray-400 italic">Never</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <Button onClick={() => onEditProfile(user.id)} variant="outline"
                              className="text-blue-600 hover:text-blue-900 border-blue-300 text-xs px-3 py-1 flex items-center gap-1">
                              <Icon icon="material-symbols:person" className="w-4 h-4" /> Profile
                            </Button>
                            <a href={`/admin/users/${user.id}/activity`}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-600 hover:text-purple-900 border border-purple-300 rounded-lg transition-colors">
                              <Icon icon="material-symbols:history" className="w-4 h-4 mr-1" /> Activity
                            </a>
                            <Button onClick={() => onEnrollUser(user)} variant="outline"
                              className="text-green-600 hover:text-green-900 border-green-300 text-xs px-3 py-1 flex items-center gap-1">
                              <Icon icon="material-symbols:school" className="w-4 h-4" /> Enroll
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
