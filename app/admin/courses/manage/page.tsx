'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';
import { Input } from '@/app/components/Input';
import RoleGuard from '@/app/components/RoleGuard';
import CourseRestoreButton from '@/app/components/CourseRestoreButton';
import dynamic from 'next/dynamic';
import { stripHtml } from '@/lib/utils';

const TextEditor = dynamic(() => import('@/app/components/TextEditor'), {
  ssr: false,
  loading: () => <div className="h-[200px] border border-gray-300 rounded-md animate-pulse bg-gray-100" />
});

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
  created_at: string;
  updated_at: string;
}

interface CourseStats {
  total: number;
  published: number;
  draft: number;
  bySubject: { [key: string]: number };
  byDifficulty: { [key: string]: number };
}

export default function ManageCoursesPage() {
  const { supabase } = useSupabase();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);

  // Form states
  const [showAddCourseForm, setShowAddCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    thumbnail: '',
    grade_level: '',
    subject_area: '',
    difficulty: 'beginner',
    modality: 'self_paced',
    estimated_duration: '',
    syllabus: '',
    published: false,
    featured: false
  });

  // Add course form
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    thumbnail: '',
    grade_level: '',
    subject_area: '',
    difficulty: 'beginner',
    modality: 'self_paced',
    estimated_duration: '',
    syllabus: '',
    published: false,
    featured: false
  });

  // Statistics
  const [stats, setStats] = useState<CourseStats>({
    total: 0,
    published: 0,
    draft: 0,
    bySubject: {},
    byDifficulty: {}
  });

  // Bulk operations
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Filter courses based on search and filters
  useEffect(() => {
    let filtered = courses;

    if (searchQuery) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stripHtml(course.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.subject_area.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (subjectFilter) {
      filtered = filtered.filter(course => course.subject_area === subjectFilter);
    }

    if (difficultyFilter) {
      filtered = filtered.filter(course => course.difficulty === difficultyFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(course => 
        statusFilter === 'published' ? course.published : !course.published
      );
    }

    setFilteredCourses(filtered);
  }, [courses, searchQuery, subjectFilter, difficultyFilter, statusFilter]);

  // Calculate statistics
  useEffect(() => {
    const newStats: CourseStats = {
      total: courses.length,
      published: courses.filter(c => c.published).length,
      draft: courses.filter(c => !c.published).length,
      bySubject: {},
      byDifficulty: {}
    };

    courses.forEach(course => {
      newStats.bySubject[course.subject_area] = (newStats.bySubject[course.subject_area] || 0) + 1;
      newStats.byDifficulty[course.difficulty] = (newStats.byDifficulty[course.difficulty] || 0) + 1;
    });

    setStats(newStats);
  }, [courses]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to access this page.');
        return;
      }

      // Load courses via API
      const coursesResponse = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        setCourses(coursesData.courses || []);
      } else {
        throw new Error('Failed to load courses');
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to create courses.');
        return;
      }

      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(newCourse)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create course');
      }

      setSuccess('Course created successfully!');
      setNewCourse({
        title: '',
        description: '',
        thumbnail: '',
        grade_level: '',
        subject_area: '',
        difficulty: 'beginner',
        modality: 'self_paced',
        estimated_duration: '',
        syllabus: '',
        published: false,
        featured: false
      });
      setShowAddCourseForm(false);
      loadData();

    } catch (err: any) {
      console.error('Error creating course:', err);
      setError(err.message || 'Failed to create course. Please try again.');
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course.id);
    setEditForm({
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail || '',
      grade_level: course.grade_level,
      subject_area: course.subject_area,
      difficulty: course.difficulty,
      modality: course.modality || 'self_paced',
      estimated_duration: course.estimated_duration || '',
      syllabus: course.syllabus,
      published: course.published,
      featured: course.featured || false
    });
  };

  const handleSaveEdit = async (courseId: string) => {
    try {
      setError('');
      setSuccess('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to edit courses.');
        return;
      }

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update course');
      }

      setSuccess('Course updated successfully!');
      setEditingCourse(null);
      loadData();

    } catch (err: any) {
      console.error('Error updating course:', err);
      setError(err.message || 'Failed to update course. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
    setEditForm({
      title: '',
      description: '',
      thumbnail: '',
      grade_level: '',
      subject_area: '',
      difficulty: 'beginner',
      modality: 'self_paced',
      estimated_duration: '',
      syllabus: '',
      published: false,
      featured: false
    });
  };

  const [cloningCourse, setCloningCourse] = useState<string | null>(null);

  const handleCloneCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Create a copy of "${courseTitle}"? The copy will be unpublished.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      setCloningCourse(courseId);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('You must be logged in to clone courses.');
        return;
      }

      const response = await fetch(`/api/courses/${courseId}/clone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clone course');
      }

      const data = await response.json();
      setSuccess(`Course cloned successfully! "${data.course.title}" created with ${data.lessons_cloned} lessons.`);
      loadData();

    } catch (err: any) {
      console.error('Error cloning course:', err);
      setError(err.message || 'Failed to clone course. Please try again.');
    } finally {
      setCloningCourse(null);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to delete courses.');
        return;
      }

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete course');
      }

      setSuccess(`Course "${courseTitle}" deleted successfully!`);
      loadData();

    } catch (err: any) {
      console.error('Error deleting course:', err);
      setError(err.message || 'Failed to delete course. Please try again.');
    }
  };

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    try {
      setError('');
      setSuccess('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to update courses.');
        return;
      }

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ published: !currentStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update course');
      }

      setSuccess(`Course ${!currentStatus ? 'published' : 'unpublished'} successfully!`);
      loadData();

    } catch (err: any) {
      console.error('Error updating course:', err);
      setError(err.message || 'Failed to update course. Please try again.');
    }
  };

  const handleToggleFeatured = async (courseId: string, currentStatus: boolean) => {
    try {
      setError('');
      setSuccess('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to update courses.');
        return;
      }

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ featured: !currentStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update course');
      }

      setSuccess(`Course ${!currentStatus ? 'marked as featured' : 'removed from featured'} successfully!`);
      loadData();

    } catch (err: any) {
      console.error('Error updating course:', err);
      setError(err.message || 'Failed to update course. Please try again.');
    }
  };

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
    if (selectedCourses.length === 0) return;

    const actionText = action === 'delete' ? 'delete' : action === 'publish' ? 'publish' : 'unpublish';
    if (!confirm(`Are you sure you want to ${actionText} ${selectedCourses.length} course(s)?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to perform bulk actions.');
        return;
      }

      const promises = selectedCourses.map(courseId => {
        if (action === 'delete') {
          return fetch(`/api/courses/${courseId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
        } else {
          const course = courses.find(c => c.id === courseId);
          return fetch(`/api/courses/${courseId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ 
              published: action === 'publish' 
            })
          });
        }
      });

      await Promise.all(promises);
      setSuccess(`Bulk ${actionText} completed successfully!`);
      setSelectedCourses([]);
      setShowBulkActions(false);
      loadData();

    } catch (err: any) {
      console.error('Error performing bulk action:', err);
      setError(err.message || 'Failed to perform bulk action. Please try again.');
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const selectAllCourses = () => {
    setSelectedCourses(filteredCourses.map(c => c.id));
  };

  const clearSelection = () => {
    setSelectedCourses([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-oecs-lime-green mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading courses...</p>
            </div>
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
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-12">
              <div className="text-center bg-white rounded-lg shadow p-8 max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon icon="material-symbols:block" className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-4">
                  You don't have permission to access this page. Admin privileges are required.
                </p>
                <Button 
                  onClick={() => window.history.back()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
              <p className="text-gray-600 mt-2">Manage courses, content, and publishing</p>
            </div>
            <div className="flex gap-3">
              <CourseRestoreButton 
                onRestoreComplete={(courseId) => {
                  setSuccess('Course restored successfully!');
                  loadData();
                  setTimeout(() => window.location.href = `/course/${courseId}`, 2000);
                }}
                className="flex-shrink-0"
              />
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Statistics Dashboard */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:school" className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:visibility" className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Published</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:draft" className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Drafts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:analytics" className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Subjects</p>
                  <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.bySubject).length}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Search and Filter Controls */}
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Icon icon="material-symbols:search" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Search & Filter Courses</h2>
                <p className="text-sm text-gray-600">Find courses by title, description, or subject</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All subjects</option>
                  {Object.keys(stats.bySubject).map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => { 
                    setSearchQuery(''); 
                    setSubjectFilter(''); 
                    setDifficultyFilter(''); 
                    setStatusFilter(''); 
                  }}
                  variant="outline"
                  className="flex-1 flex items-center gap-2"
                >
                  <Icon icon="material-symbols:clear" className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-8 flex flex-wrap gap-4">
            <Button
              onClick={() => setShowAddCourseForm(true)}
              className="bg-oecs-lime-green hover:bg-oecs-lime-green-dark flex items-center gap-2"
            >
              <Icon icon="material-symbols:add" className="w-5 h-5" />
              Add New Course
            </Button>
            {selectedCourses.length > 0 && (
              <Button
                onClick={() => setShowBulkActions(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Icon icon="material-symbols:more-horiz" className="w-5 h-5" />
                Bulk Actions ({selectedCourses.length})
              </Button>
            )}
          </div>

          {/* Bulk Actions Modal */}
          {showBulkActions && (
            <div className="mb-8 bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Bulk Actions</h3>
                <Button
                  onClick={() => setShowBulkActions(false)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Icon icon="material-symbols:close" className="w-5 h-5" />
                  Close
                </Button>
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={() => handleBulkAction('publish')}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  <Icon icon="material-symbols:visibility" className="w-5 h-5" />
                  Publish Selected
                </Button>
                <Button
                  onClick={() => handleBulkAction('unpublish')}
                  className="bg-yellow-600 hover:bg-yellow-700 flex items-center gap-2"
                >
                  <Icon icon="material-symbols:draft" className="w-5 h-5" />
                  Unpublish Selected
                </Button>
                <Button
                  onClick={() => handleBulkAction('delete')}
                  className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                >
                  <Icon icon="material-symbols:delete" className="w-5 h-5" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Add Course Form */}
          {showAddCourseForm && (
            <div className="mb-8 bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Add New Course</h2>
                <Button
                  onClick={() => setShowAddCourseForm(false)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Icon icon="material-symbols:close" className="w-5 h-5" />
                  Cancel
                </Button>
              </div>
              <form onSubmit={handleAddCourse} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Course Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                      placeholder="e.g., Introduction to Mathematics"
                      required
                      className="w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500">A clear, descriptive name for your course</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject Area <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newCourse.subject_area}
                      onChange={(e) => setNewCourse({ ...newCourse, subject_area: e.target.value })}
                      placeholder="e.g., Mathematics, Science, Language Arts"
                      required
                      className="w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500">The academic discipline or subject category</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grade Level <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newCourse.grade_level}
                      onChange={(e) => setNewCourse({ ...newCourse, grade_level: e.target.value })}
                      placeholder="e.g., Grade 9-12, University, Professional"
                      required
                      className="w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500">Target audience or educational level</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    <select
                      value={newCourse.difficulty}
                      onChange={(e) => setNewCourse({ ...newCourse, difficulty: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">How challenging is the course content?</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modality</label>
                    <select
                      value={newCourse.modality}
                      onChange={(e) => setNewCourse({ ...newCourse, modality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green"
                    >
                      <option value="self_paced">Self-paced</option>
                      <option value="blended">Blended</option>
                      <option value="instructor_led">Instructor-led</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">How will this course be delivered?</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration</label>
                    <Input
                      value={newCourse.estimated_duration}
                      onChange={(e) => setNewCourse({ ...newCourse, estimated_duration: e.target.value })}
                      placeholder="e.g., 4 weeks, 20 hours"
                      className="w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500">How long does it take to complete this course?</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
                    <Input
                      value={newCourse.thumbnail}
                      onChange={(e) => setNewCourse({ ...newCourse, thumbnail: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      type="url"
                      className="w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500">URL to course cover image (recommended: 800x450px)</p>
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="published"
                        checked={newCourse.published}
                        onChange={(e) => setNewCourse({ ...newCourse, published: e.target.checked })}
                        className="h-4 w-4 text-oecs-lime-green focus:ring-oecs-lime-green border-gray-300 rounded"
                      />
                      <label htmlFor="published" className="ml-2 block text-sm text-gray-900">
                        Publish immediately
                      </label>
                      <span className="ml-2 text-xs text-gray-500" title="When checked, the course will be visible to students right away">
                        <Icon icon="material-symbols:info-outline" className="w-4 h-4 text-gray-400 cursor-help" />
                      </span>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="featured-new"
                        checked={newCourse.featured}
                        onChange={(e) => setNewCourse({ ...newCourse, featured: e.target.checked })}
                        className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor="featured-new" className="ml-2 block text-sm text-gray-900 flex items-center gap-1">
                        <Icon icon="material-symbols:star" className="w-4 h-4 text-orange-500" />
                        Featured (Homepage)
                      </label>
                      <span className="ml-2 text-xs text-gray-500" title="Featured courses appear prominently on the homepage">
                        <Icon icon="material-symbols:info-outline" className="w-4 h-4 text-gray-400 cursor-help" />
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <TextEditor
                    value={newCourse.description}
                    onChange={(html) => setNewCourse({ ...newCourse, description: html })}
                    placeholder="Provide a brief overview of what students will learn in this course..."
                    height={200}
                    showFullscreenButton={false}
                  />
                  <p className="mt-1 text-xs text-gray-500">A short summary that helps students understand what the course covers (2-3 sentences)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Syllabus</label>
                  <TextEditor
                    value={newCourse.syllabus}
                    onChange={(html) => setNewCourse({ ...newCourse, syllabus: html })}
                    placeholder="Week 1: Introduction to the topic. Week 2: Core concepts and fundamentals. Week 3: Practical applications..."
                    height={250}
                    showFullscreenButton={false}
                  />
                  <p className="mt-1 text-xs text-gray-500">Outline of topics, modules, or weekly schedule (optional but recommended)</p>
                </div>
                <div className="flex gap-4">
                  <Button 
                    type="submit"
                    className="bg-oecs-lime-green hover:bg-oecs-lime-green-dark flex items-center gap-2"
                  >
                    <Icon icon="material-symbols:add" className="w-5 h-5" />
                    Create Course
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddCourseForm(false)}
                    className="flex items-center gap-2"
                  >
                    <Icon icon="material-symbols:close" className="w-5 h-5" />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Courses Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Courses ({filteredCourses.length} of {courses.length})
                </h2>
                <div className="flex gap-2">
                  <Button
                    onClick={selectAllCourses}
                    variant="outline"
                    className="text-sm"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={clearSelection}
                    variant="outline"
                    className="text-sm"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedCourses.length === filteredCourses.length && filteredCourses.length > 0}
                        onChange={() => selectedCourses.length === filteredCourses.length ? clearSelection() : selectAllCourses()}
                        className="h-4 w-4 text-oecs-lime-green focus:ring-oecs-lime-green border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        {searchQuery || subjectFilter || difficultyFilter || statusFilter 
                          ? 'No courses match your search criteria.' 
                          : 'No courses found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedCourses.includes(course.id)}
                            onChange={() => toggleCourseSelection(course.id)}
                            className="h-4 w-4 text-oecs-lime-green focus:ring-oecs-lime-green border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {course.thumbnail && (
                              <img
                                className="h-10 w-10 rounded-lg object-cover mr-3"
                                src={course.thumbnail}
                                alt={course.title}
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{course.title}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {stripHtml(course.description || '')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {course.subject_area}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            course.difficulty === 'beginner' 
                              ? 'bg-green-100 text-green-800'
                              : course.difficulty === 'intermediate'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {course.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              course.published 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {course.published ? 'Published' : 'Draft'}
                            </span>
                            {course.featured && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                <Icon icon="material-symbols:star" className="w-3 h-3" />
                                Featured
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(course.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                                <Button
                                  onClick={() => handleEditCourse(course)}
                                  variant="outline"
                                  className="text-blue-600 hover:text-blue-900 border-blue-300 hover:border-blue-400 text-xs px-3 py-1 flex items-center gap-1"
                                >
                                  <Icon icon="material-symbols:edit" className="w-4 h-4" />
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => handleTogglePublish(course.id, course.published)}
                                  variant="outline"
                                  className={`text-xs px-3 py-1 flex items-center gap-1 ${
                                    course.published
                                      ? 'text-yellow-600 hover:text-yellow-900 border-yellow-300 hover:border-yellow-400'
                                      : 'text-green-600 hover:text-green-900 border-green-300 hover:border-green-400'
                                  }`}
                                >
                                  <Icon
                                    icon={course.published ? "material-symbols:draft" : "material-symbols:visibility"}
                                    className="w-4 h-4"
                                  />
                                  {course.published ? 'Unpublish' : 'Publish'}
                                </Button>
                                <Button
                                  onClick={() => handleToggleFeatured(course.id, course.featured || false)}
                                  variant="outline"
                                  className={`text-xs px-3 py-1 flex items-center gap-1 ${
                                    course.featured
                                      ? 'text-orange-600 hover:text-orange-900 border-orange-300 hover:border-orange-400 bg-orange-50'
                                      : 'text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400'
                                  }`}
                                  title={course.featured ? "Remove from homepage" : "Feature on homepage"}
                                >
                                  <Icon
                                    icon={course.featured ? "material-symbols:star" : "material-symbols:star-outline"}
                                    className="w-4 h-4"
                                  />
                                  {course.featured ? 'Featured' : 'Feature'}
                                </Button>
                                <Button
                                  onClick={() => handleCloneCourse(course.id, course.title)}
                                  variant="outline"
                                  disabled={cloningCourse === course.id}
                                  className="text-purple-600 hover:text-purple-900 border-purple-300 hover:border-purple-400 text-xs px-3 py-1 flex items-center gap-1"
                                  title="Create a copy of this course"
                                >
                                  {cloningCourse === course.id ? (
                                    <>
                                      <Icon icon="material-symbols:sync" className="w-4 h-4 animate-spin" />
                                      Cloning...
                                    </>
                                  ) : (
                                    <>
                                      <Icon icon="material-symbols:content-copy" className="w-4 h-4" />
                                      Clone
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleDeleteCourse(course.id, course.title)}
                                  variant="outline"
                                  className="text-red-600 hover:text-red-900 border-red-300 hover:border-red-400 text-xs px-3 py-1 flex items-center gap-1"
                                >
                                  <Icon icon="material-symbols:delete" className="w-4 h-4" />
                                  Delete
                                </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit Course</h2>
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Icon icon="material-symbols:close" className="w-5 h-5" />
                Close
              </Button>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(editingCourse); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Course Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="e.g., Introduction to Mathematics"
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject Area <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={editForm.subject_area}
                      onChange={(e) => setEditForm({ ...editForm, subject_area: e.target.value })}
                      placeholder="e.g., Mathematics, Science, Language Arts"
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grade Level <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={editForm.grade_level}
                      onChange={(e) => setEditForm({ ...editForm, grade_level: e.target.value })}
                      placeholder="e.g., Grade 9-12, University, Professional"
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    <select
                      value={editForm.difficulty}
                      onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modality</label>
                    <select
                      value={editForm.modality}
                      onChange={(e) => setEditForm({ ...editForm, modality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green"
                    >
                      <option value="self_paced">Self-paced</option>
                      <option value="blended">Blended</option>
                      <option value="instructor_led">Instructor-led</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration</label>
                    <Input
                      value={editForm.estimated_duration}
                      onChange={(e) => setEditForm({ ...editForm, estimated_duration: e.target.value })}
                      placeholder="e.g., 4 weeks, 20 hours"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
                    <Input
                      value={editForm.thumbnail}
                      onChange={(e) => setEditForm({ ...editForm, thumbnail: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      type="url"
                      className="w-full"
                    />
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit-published"
                        checked={editForm.published}
                        onChange={(e) => setEditForm({ ...editForm, published: e.target.checked })}
                        className="h-4 w-4 text-oecs-lime-green focus:ring-oecs-lime-green border-gray-300 rounded"
                      />
                      <label htmlFor="edit-published" className="ml-2 block text-sm text-gray-900">
                        Published
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit-featured"
                        checked={editForm.featured}
                        onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })}
                        className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor="edit-featured" className="ml-2 block text-sm text-gray-900 flex items-center gap-1">
                        <Icon icon="material-symbols:star" className="w-4 h-4 text-orange-500" />
                        Featured (Homepage)
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <TextEditor
                    value={editForm.description}
                    onChange={(html) => setEditForm({ ...editForm, description: html })}
                    placeholder="Provide a brief overview of what students will learn..."
                    height={200}
                    showFullscreenButton={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Syllabus</label>
                  <TextEditor
                    value={editForm.syllabus}
                    onChange={(html) => setEditForm({ ...editForm, syllabus: html })}
                    placeholder="Outline of topics, modules, or weekly schedule..."
                    height={250}
                    showFullscreenButton={false}
                  />
                </div>
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <Button
                    type="submit"
                    className="bg-oecs-lime-green hover:bg-oecs-lime-green-dark flex items-center gap-2"
                  >
                    <Icon icon="material-symbols:check" className="w-5 h-5" />
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2"
                  >
                    <Icon icon="material-symbols:close" className="w-5 h-5" />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
