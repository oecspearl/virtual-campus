'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import RoleGuard from '@/app/components/RoleGuard';
import CourseRestoreButton from '@/app/components/course/CourseRestoreButton';
import { stripHtml } from '@/lib/utils';

import CourseForm, { CourseFormValues, EMPTY_COURSE_FORM } from './_components/CourseForm';
import CourseStatsCards from './_components/CourseStatsCards';
import CourseFilters, { CourseFilterValues } from './_components/CourseFilters';
import CourseTable from './_components/CourseTable';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  grade_level: string;
  subject_area: string;
  difficulty: string;
  modality: string;
  estimated_duration: string | null;
  syllabus: string;
  published: boolean;
  featured: boolean;
  course_format: string;
  created_at: string;
  updated_at: string;
}

export default function ManageCoursesPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [filters, setFilters] = useState<CourseFilterValues>({ search: '', subject: '', difficulty: '', status: '' });

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCourse, setNewCourse] = useState<CourseFormValues>(EMPTY_COURSE_FORM);

  // Bulk & clone
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [cloningCourse, setCloningCourse] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  // Derived data
  const filteredCourses = useMemo(() => {
    let result = courses;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        stripHtml(c.description || '').toLowerCase().includes(q) ||
        c.subject_area.toLowerCase().includes(q)
      );
    }
    if (filters.subject) result = result.filter(c => c.subject_area === filters.subject);
    if (filters.difficulty) result = result.filter(c => c.difficulty === filters.difficulty);
    if (filters.status) result = result.filter(c => filters.status === 'published' ? c.published : !c.published);
    return result;
  }, [courses, filters]);

  const stats = useMemo(() => ({
    total: courses.length,
    published: courses.filter(c => c.published).length,
    draft: courses.filter(c => !c.published).length,
    subjectCount: new Set(courses.map(c => c.subject_area)).size,
  }), [courses]);

  const subjects = useMemo(() =>
    Array.from(new Set(courses.map(c => c.subject_area))).filter(Boolean).sort(),
  [courses]);

  const hasFilters = !!(filters.search || filters.subject || filters.difficulty || filters.status);

  // --- API helpers ---

  async function getToken() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('You must be logged in.');
    return session.access_token;
  }

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const token = await getToken();
      const res = await fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load courses');
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  async function apiCall(method: string, url: string, body?: any) {
    const token = await getToken();
    const headers: any = { Authorization: `Bearer ${token}` };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed`);
    }
    return res.json();
  }

  // --- Handlers ---

  async function handleAddCourse(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(''); setSuccess('');
      await apiCall('POST', '/api/courses', newCourse);
      setSuccess('Course created successfully!');
      setNewCourse(EMPTY_COURSE_FORM);
      setShowAddForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCloneCourse(courseId: string, title: string) {
    if (!confirm(`Create a copy of "${title}"? The copy will be unpublished.`)) return;
    try {
      setError(''); setSuccess('');
      setCloningCourse(courseId);
      const data = await apiCall('POST', `/api/courses/${courseId}/clone`);
      setSuccess(`Course cloned! "${data.course.title}" created with ${data.lessons_cloned} lessons.`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCloningCourse(null);
    }
  }

  async function handleDeleteCourse(courseId: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      setError(''); setSuccess('');
      await apiCall('DELETE', `/api/courses/${courseId}`);
      setSuccess(`Course "${title}" deleted.`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleTogglePublish(courseId: string, published: boolean) {
    try {
      setError(''); setSuccess('');
      await apiCall('PUT', `/api/courses/${courseId}`, { published: !published });
      setSuccess(`Course ${!published ? 'published' : 'unpublished'} successfully!`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleToggleFeatured(courseId: string, featured: boolean) {
    try {
      setError(''); setSuccess('');
      await apiCall('PUT', `/api/courses/${courseId}`, { featured: !featured });
      setSuccess(`Course ${!featured ? 'marked as featured' : 'removed from featured'}.`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleBulkAction(action: 'publish' | 'unpublish' | 'delete') {
    if (selectedCourses.length === 0) return;
    if (!confirm(`${action} ${selectedCourses.length} course(s)?`)) return;
    try {
      setError(''); setSuccess('');
      const token = await getToken();
      const headers: any = { Authorization: `Bearer ${token}` };
      await Promise.all(selectedCourses.map(id =>
        action === 'delete'
          ? fetch(`/api/courses/${id}`, { method: 'DELETE', headers })
          : fetch(`/api/courses/${id}`, {
              method: 'PUT',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ published: action === 'publish' }),
            })
      ));
      setSuccess(`Bulk ${action} completed!`);
      setSelectedCourses([]);
      setShowBulkActions(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleTableAction(action: any) {
    switch (action.type) {
      case 'edit': router.push(`/admin/courses/manage/${action.course.id}/edit`); break;
      case 'togglePublish': handleTogglePublish(action.courseId, action.published); break;
      case 'toggleFeatured': handleToggleFeatured(action.courseId, action.featured); break;
      case 'clone': handleCloneCourse(action.courseId, action.title); break;
      case 'delete': handleDeleteCourse(action.courseId, action.title); break;
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-oecs-lime-green mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Loading courses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard
      roles={['admin', 'super_admin', 'curriculum_designer']}
      fallback={
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4 flex items-center justify-center py-12">
            <div className="text-center bg-white rounded-lg shadow p-8 max-w-md">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon="material-symbols:block" className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">Admin privileges required.</p>
              <Button onClick={() => window.history.back()} className="bg-blue-600 hover:bg-blue-700">Go Back</Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-normal text-slate-900 tracking-tight">Course Management</h1>
              <p className="text-gray-600 mt-1">Manage courses, content, and publishing</p>
            </div>
            <CourseRestoreButton
              onRestoreComplete={(courseId) => {
                setSuccess('Course restored!');
                loadData();
                setTimeout(() => window.location.href = `/course/${courseId}`, 2000);
              }}
              className="flex-shrink-0"
            />
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Stats */}
          <CourseStatsCards stats={stats} />

          {/* Filters */}
          <CourseFilters filters={filters} onFiltersChange={setFilters} subjects={subjects} />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-oecs-lime-green hover:bg-oecs-lime-green-dark flex items-center gap-2"
            >
              <Icon icon="material-symbols:add" className="w-5 h-5" />
              Add New Course
            </Button>
            {selectedCourses.length > 0 && (
              <Button onClick={() => setShowBulkActions(!showBulkActions)} variant="outline" className="flex items-center gap-2">
                <Icon icon="material-symbols:more-horiz" className="w-5 h-5" />
                Bulk Actions ({selectedCourses.length})
              </Button>
            )}
          </div>

          {/* Bulk Actions */}
          {showBulkActions && (
            <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">{selectedCourses.length} selected:</span>
              <Button onClick={() => handleBulkAction('publish')} className="bg-green-600 hover:bg-green-700 text-sm flex items-center gap-1">
                <Icon icon="material-symbols:visibility" className="w-4 h-4" /> Publish
              </Button>
              <Button onClick={() => handleBulkAction('unpublish')} className="bg-yellow-600 hover:bg-yellow-700 text-sm flex items-center gap-1">
                <Icon icon="material-symbols:draft" className="w-4 h-4" /> Unpublish
              </Button>
              <Button onClick={() => handleBulkAction('delete')} className="bg-red-600 hover:bg-red-700 text-sm flex items-center gap-1">
                <Icon icon="material-symbols:delete" className="w-4 h-4" /> Delete
              </Button>
            </div>
          )}

          {/* Add Course Form */}
          {showAddForm && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Add New Course</h2>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                  <Icon icon="material-symbols:close" className="w-5 h-5" />
                </button>
              </div>
              <CourseForm
                values={newCourse}
                onChange={setNewCourse}
                onSubmit={handleAddCourse}
                onCancel={() => setShowAddForm(false)}
                submitLabel="Create Course"
                submitIcon="material-symbols:add"
              />
            </div>
          )}

          {/* Table */}
          <CourseTable
            courses={filteredCourses}
            totalCount={courses.length}
            selectedIds={selectedCourses}
            onSelectToggle={(id) => setSelectedCourses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            onSelectAll={() => setSelectedCourses(filteredCourses.map(c => c.id))}
            onClearSelection={() => setSelectedCourses([])}
            onAction={handleTableAction}
            cloningId={cloningCourse}
            hasFilters={hasFilters}
          />
        </div>
      </div>
    </RoleGuard>
  );
}
