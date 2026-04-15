'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { Icon } from '@iconify/react';
import { createClient } from '@supabase/supabase-js';
import Breadcrumb from '@/app/components/ui/Breadcrumb';

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

  const isStaff = ['instructor', 'admin', 'super_admin', 'curriculum_designer'].includes(userRole);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-slate-200 border-t-slate-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Assignments' },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-normal text-slate-900 tracking-tight">Assignments</h1>
          {isStaff && (
            <Link
              href="/assignments/create"
              className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              New Assignment
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="mb-5">
          <div className="relative max-w-md">
            <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="bg-white rounded-lg border border-gray-200/80 p-8 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              onClick={fetchAssignments}
              className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200/80 p-12 text-center">
            <p className="text-sm text-slate-400 mb-1">
              {searchQuery ? 'No assignments match your search.' : 'No assignments available.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white rounded-lg border border-gray-200/80 hover:bg-gray-50/50 transition-colors"
              >
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          {assignment.courses?.title || 'General'}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-slate-700 truncate mb-1">
                        {assignment.title}
                      </h3>
                      {assignment.description && (
                        <p className="text-xs text-slate-400 line-clamp-1">{assignment.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        {assignment.points && <span>{assignment.points} pts</span>}
                        {assignment.due_date && (
                          <>
                            <span className="text-slate-200">|</span>
                            <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <Link
                        href={`/assignment/${assignment.id}`}
                        className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        View
                      </Link>
                      {isStaff && (
                        <Link
                          href={`/assignments/${assignment.id}/edit`}
                          className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
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
