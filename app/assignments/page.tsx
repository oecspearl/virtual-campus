'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { Icon } from '@iconify/react';
import { createClient } from '@supabase/supabase-js';
import Breadcrumb from '@/app/components/Breadcrumb';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  published: boolean;
  course_id?: string;
  lesson_id?: string;
  points?: number;
  created_at: string;
  courses?: {
    title: string;
  };
  lessons?: {
    title: string;
  };
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<string>('student');

  useEffect(() => {
    fetchAssignments();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setUserRole(userData.role);
        }
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          due_date,
          published,
          course_id,
          lesson_id,
          points,
          created_at,
          courses(title),
          lessons(title)
        `)
        .eq('published', true)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setAssignments((data as any) || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to load assignments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    return assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           assignment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           assignment.courses?.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:loading" className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-8xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Assignments' },
          ]}
          className="mb-6"
        />
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center mb-2">
                    <Icon icon="mdi:file-document-edit" className="w-8 h-8 mr-3" />
                    Assignments
                  </h1>
                  <p className="text-purple-100 text-lg">View and manage your assignments</p>
                </div>
                {(userRole === 'instructor' || userRole === 'admin' || userRole === 'super_admin' || userRole === 'curriculum_designer') && (
                  <Link
                    href="/assignments/create"
                    className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <Icon icon="mdi:plus-circle" className="w-5 h-5" />
                    Create Assignment
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="relative max-w-2xl">
              <Icon icon="mdi:magnify" className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search assignments by title, description, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl shadow-lg p-8 text-center">
            <Icon icon="mdi:alert-circle" className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-800 mb-2">Error Loading Assignments</h3>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={fetchAssignments}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
            >
              <Icon icon="mdi:refresh" className="w-5 h-5 inline mr-2" />
              Try Again
            </button>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-12 text-center">
            <Icon icon="mdi:assignment" className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-600 mb-6 text-lg">
              {searchQuery ? 'Try adjusting your search terms.' : 'No assignments are available at the moment.'}
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <Icon icon="mdi:book-open-variant" className="w-5 h-5 mr-2" />
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredAssignments.map((assignment) => (
              <div 
                key={assignment.id} 
                className="bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                        {assignment.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Icon icon="mdi:book-open" className="w-4 h-4" />
                          <span>{assignment.courses?.title || assignment.lessons?.title || 'General Assignment'}</span>
                        </div>
                        {assignment.points && (
                          <>
                            <span className="text-gray-400">•</span>
                            <div className="flex items-center gap-1">
                              <Icon icon="mdi:star" className="w-4 h-4 text-yellow-500" />
                              <span className="font-medium">{assignment.points} point{assignment.points !== 1 ? 's' : ''}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {assignment.due_date && (
                      <div className="text-right ml-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 rounded-lg">
                          <Icon icon="mdi:calendar-clock" className="w-5 h-5 text-purple-600" />
                          <div>
                            <div className="text-xs text-gray-500">Due</div>
                            <div className="text-sm font-semibold text-purple-700">
                              {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {assignment.description && (
                  <div className="px-6 py-4">
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{assignment.description}</p>
                  </div>
                )}

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Icon icon="mdi:calendar-plus" className="w-4 h-4" />
                    <span>Created {new Date(assignment.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/assignment/${assignment.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                      <Icon icon="mdi:eye" className="w-4 h-4" />
                      View
                    </Link>
                    {(userRole === 'instructor' || userRole === 'admin' || userRole === 'super_admin' || userRole === 'curriculum_designer') && (
                      <Link
                        href={`/assignments/${assignment.id}/edit`}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                      >
                        <Icon icon="mdi:pencil" className="w-4 h-4" />
                        Edit
                      </Link>
                    )}
                    {(userRole === 'instructor' || userRole === 'admin' || userRole === 'super_admin') && (
                      <Link
                        href={`/grade/assignment/${assignment.id}`}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                      >
                        <Icon icon="mdi:check-circle" className="w-4 h-4" />
                        Grade
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
