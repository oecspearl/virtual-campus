'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';
import Button from '@/app/components/ui/Button';
import RoleGuard from '@/app/components/RoleGuard';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import AccessibleModal from '@/app/components/ui/AccessibleModal';

interface Programme {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  difficulty?: string;
  estimated_duration?: string;
  passing_score: number;
  published: boolean;
  course_count?: number;
  enrollment_count?: number;
  categories?: Array<{ id: string; name: string; color: string }>;
}

interface Course {
  id: string;
  title: string;
  thumbnail?: string;
  published: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Enrollment {
  id: string;
  student_id: string;
  status: string;
  enrolled_at: string;
  final_score?: number;
  completed_at?: string;
  student: Student;
}

export default function AdminProgrammesPage() {
  const { supabase } = useSupabase();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: '',
    estimated_duration: '',
    passing_score: 70,
    published: false,
    category_ids: [] as string[],
    primary_category_id: ''
  });
  const [programmeCourses, setProgrammeCourses] = useState<Array<{
    course_id: string;
    order: number;
    weight: number;
    is_required: boolean;
  }>>([]);
  const [saving, setSaving] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
  }, [supabase]);

  const loadProgrammes = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/programmes?includeUnpublished=true&withCounts=true', { headers });
      const data = await res.json();
      setProgrammes(data.programmes || []);
    } catch (error) {
      console.error('Error loading programmes:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const loadCourses = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/courses', { headers });
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  }, [getAuthHeaders]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories?flat=true');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const loadAllStudents = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/users?role=student&limit=500', { headers });
      const data = await res.json();
      setAllStudents(data.users || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  }, [getAuthHeaders]);

  const loadEnrollments = useCallback(async (programmeId: string) => {
    setLoadingEnrollments(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/programmes/${programmeId}/enrollments`, { headers });
      const data = await res.json();
      setEnrollments(data.enrollments || []);
    } catch (error) {
      console.error('Error loading enrollments:', error);
    } finally {
      setLoadingEnrollments(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadProgrammes();
    loadCourses();
    loadCategories();
  }, [loadProgrammes, loadCourses, loadCategories]);

  const handleCreate = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/programmes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        // Save categories if any
        if (formData.category_ids.length > 0) {
          await fetch(`/api/programmes/${data.programme.id}/categories`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({
              category_ids: formData.category_ids,
              primary_category_id: formData.primary_category_id
            })
          });
        }
        setShowCreateModal(false);
        resetForm();
        loadProgrammes();
      }
    } catch (error) {
      console.error('Error creating programme:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProgramme || !formData.title.trim()) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/programmes/${selectedProgramme.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        // Update categories
        await fetch(`/api/programmes/${selectedProgramme.id}/categories`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            category_ids: formData.category_ids,
            primary_category_id: formData.primary_category_id
          })
        });

        setShowEditModal(false);
        resetForm();
        loadProgrammes();
      }
    } catch (error) {
      console.error('Error updating programme:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this programme?')) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/programmes/${id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        loadProgrammes();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete programme');
      }
    } catch (error) {
      console.error('Error deleting programme:', error);
    }
  };

  const handleTogglePublish = async (programme: Programme) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/programmes/${programme.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ published: !programme.published })
      });
      loadProgrammes();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const loadProgrammeCourses = async (programmeId: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/programmes/${programmeId}/courses`, { headers });
      const data = await res.json();
      setProgrammeCourses(data.courses?.map((c: any) => ({
        course_id: c.id,
        order: c.order,
        weight: c.weight,
        is_required: c.is_required
      })) || []);
    } catch (error) {
      console.error('Error loading programme courses:', error);
    }
  };

  const handleSaveCourses = async () => {
    if (!selectedProgramme) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/programmes/${selectedProgramme.id}/courses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ courses: programmeCourses })
      });
      setShowCoursesModal(false);
      loadProgrammes();
    } catch (error) {
      console.error('Error saving courses:', error);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = async (programme: Programme) => {
    setSelectedProgramme(programme);
    // Load current categories
    try {
      const res = await fetch(`/api/programmes/${programme.id}/categories`);
      const data = await res.json();
      const cats = data.categories || [];
      setFormData({
        title: programme.title,
        description: programme.description || '',
        difficulty: programme.difficulty || '',
        estimated_duration: programme.estimated_duration || '',
        passing_score: programme.passing_score,
        published: programme.published,
        category_ids: cats.map((c: any) => c.id),
        primary_category_id: cats.find((c: any) => c.is_primary)?.id || ''
      });
    } catch (error) {
      console.error('Error loading programme categories:', error);
    }
    setShowEditModal(true);
  };

  const openCoursesModal = async (programme: Programme) => {
    setSelectedProgramme(programme);
    await loadProgrammeCourses(programme.id);
    setShowCoursesModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      difficulty: '',
      estimated_duration: '',
      passing_score: 70,
      published: false,
      category_ids: [],
      primary_category_id: ''
    });
    setSelectedProgramme(null);
  };

  const addCourse = (courseId: string) => {
    if (programmeCourses.find(c => c.course_id === courseId)) return;
    setProgrammeCourses([...programmeCourses, {
      course_id: courseId,
      order: programmeCourses.length,
      weight: 1,
      is_required: true
    }]);
  };

  const removeCourse = (courseId: string) => {
    setProgrammeCourses(programmeCourses.filter(c => c.course_id !== courseId));
  };

  const updateCourseWeight = (courseId: string, weight: number) => {
    setProgrammeCourses(programmeCourses.map(c =>
      c.course_id === courseId ? { ...c, weight } : c
    ));
  };

  const toggleCourseRequired = (courseId: string) => {
    setProgrammeCourses(programmeCourses.map(c =>
      c.course_id === courseId ? { ...c, is_required: !c.is_required } : c
    ));
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId],
      primary_category_id: prev.primary_category_id === categoryId ? '' : prev.primary_category_id
    }));
  };

  const openEnrollModal = async (programme: Programme) => {
    setSelectedProgramme(programme);
    setSelectedStudentIds([]);
    setStudentSearch('');
    await loadAllStudents();
    await loadEnrollments(programme.id);
    setShowEnrollModal(true);
  };

  const handleEnrollStudents = async () => {
    if (!selectedProgramme || selectedStudentIds.length === 0) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/programmes/${selectedProgramme.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ student_ids: selectedStudentIds })
      });

      if (res.ok) {
        await loadEnrollments(selectedProgramme.id);
        setSelectedStudentIds([]);
        loadProgrammes();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to enroll students');
      }
    } catch (error) {
      console.error('Error enrolling students:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEnrollment = async (studentId: string) => {
    if (!selectedProgramme) return;
    if (!confirm('Remove this student from the programme?')) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/programmes/${selectedProgramme.id}/enrollments?student_id=${studentId}`, {
        method: 'DELETE',
        headers
      });
      await loadEnrollments(selectedProgramme.id);
      loadProgrammes();
    } catch (error) {
      console.error('Error removing enrollment:', error);
    }
  };

  const handleUpdateEnrollmentStatus = async (studentId: string, status: string) => {
    if (!selectedProgramme) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/programmes/${selectedProgramme.id}/enrollments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ student_id: studentId, status })
      });
      await loadEnrollments(selectedProgramme.id);
      loadProgrammes();
    } catch (error) {
      console.error('Error updating enrollment:', error);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredStudents = allStudents.filter(s => {
    // Exclude already enrolled students
    if (enrollments.some(e => e.student_id === s.id && e.status === 'active')) return false;
    // Filter by search
    if (!studentSearch) return true;
    const search = studentSearch.toLowerCase();
    return s.name?.toLowerCase().includes(search) || s.email?.toLowerCase().includes(search);
  });

  return (
    <RoleGuard roles={['admin', 'super_admin', 'curriculum_designer']} fallback={<div className="p-8">Access denied</div>}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Programmes' }
            ]}
            className="mb-6"
          />

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-normal text-slate-900 tracking-tight">Programmes</h1>
              <p className="text-gray-600 mt-1">Manage learning programmes with grade aggregation</p>
            </div>
            <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
              <Icon icon="material-symbols:add" className="w-5 h-5 mr-2" />
              Create Programme
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : programmes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Icon icon="material-symbols:school" className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No programmes yet</h3>
              <p className="text-gray-600 mb-6">Create your first programme to group courses with grade aggregation</p>
              <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
                Create Programme
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programmes.map(programme => (
                <div key={programme.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{programme.title}</h3>
                        {programme.categories && programme.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {programme.categories.map(cat => (
                              <span
                                key={cat.id}
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                              >
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        programme.published
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {programme.published ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    {programme.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{programme.description}</p>
                    )}

                    <div className="grid grid-cols-3 gap-4 text-center text-sm mb-4">
                      <div>
                        <div className="font-semibold text-gray-900">{programme.course_count || 0}</div>
                        <div className="text-gray-500">Courses</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{programme.enrollment_count || 0}</div>
                        <div className="text-gray-500">Enrolled</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{programme.passing_score}%</div>
                        <div className="text-gray-500">Pass Score</div>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => openCoursesModal(programme)}
                        className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Icon icon="material-symbols:school" className="w-4 h-4 inline mr-1" />
                        Courses
                      </button>
                      <button
                        onClick={() => openEnrollModal(programme)}
                        className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Icon icon="material-symbols:person-add" className="w-4 h-4 inline mr-1" />
                        Enroll
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(programme)}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Icon icon="material-symbols:edit" className="w-4 h-4 inline mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleTogglePublish(programme)}
                        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Icon icon={programme.published ? 'material-symbols:visibility-off' : 'material-symbols:visibility'} className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(programme.id)}
                        className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Icon icon="material-symbols:delete" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create/Edit Modal */}
          <AccessibleModal
            isOpen={showCreateModal || showEditModal}
            onClose={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
            title={showCreateModal ? 'Create Programme' : 'Edit Programme'}
            size="lg"
          >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Diplomacy Training Programme"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                      <select
                        value={formData.difficulty}
                        onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.passing_score}
                        onChange={e => setFormData({ ...formData, passing_score: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration</label>
                    <input
                      type="text"
                      value={formData.estimated_duration}
                      onChange={e => setFormData({ ...formData, estimated_duration: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 3 months"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={formData.category_ids.includes(cat.id)}
                            onChange={() => toggleCategory(cat.id)}
                            className="rounded"
                          />
                          <span className="flex-1 text-sm">{cat.name}</span>
                          {formData.category_ids.includes(cat.id) && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, primary_category_id: cat.id })}
                              className={`text-xs px-2 py-0.5 rounded ${
                                formData.primary_category_id === cat.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {formData.primary_category_id === cat.id ? 'Primary' : 'Set Primary'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="published"
                      checked={formData.published}
                      onChange={e => setFormData({ ...formData, published: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="published" className="text-sm text-gray-700">Published</label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button variant="outline" onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={showCreateModal ? handleCreate : handleUpdate} disabled={saving}>
                    {saving ? 'Saving...' : (showCreateModal ? 'Create' : 'Save')}
                  </Button>
                </div>
          </AccessibleModal>

          {/* Manage Courses Modal */}
          {showCoursesModal && selectedProgramme && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">Manage Courses: {selectedProgramme.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">Add courses and set weights for grade calculation</p>
                </div>
                <div className="p-6">
                  {/* Selected Courses */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Programme Courses ({programmeCourses.length})</h3>
                    {programmeCourses.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No courses added yet</p>
                    ) : (
                      <div className="space-y-2">
                        {programmeCourses.map((pc, index) => {
                          const course = courses.find(c => c.id === pc.course_id);
                          return (
                            <div key={pc.course_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                              <span className="flex-1 font-medium">{course?.title || 'Unknown'}</span>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500">Weight:</label>
                                <input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  value={pc.weight}
                                  onChange={e => updateCourseWeight(pc.course_id, Number(e.target.value))}
                                  className="w-16 px-2 py-1 text-sm border rounded"
                                />
                              </div>
                              <button
                                onClick={() => toggleCourseRequired(pc.course_id)}
                                className={`text-xs px-2 py-1 rounded ${
                                  pc.is_required
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {pc.is_required ? 'Required' : 'Optional'}
                              </button>
                              <button
                                onClick={() => removeCourse(pc.course_id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Icon icon="material-symbols:close" className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Available Courses */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Add Courses</h3>
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      {courses.filter(c => !programmeCourses.find(pc => pc.course_id === c.id)).map(course => (
                        <button
                          key={course.id}
                          onClick={() => addCourse(course.id)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0 text-left"
                        >
                          <Icon icon="material-symbols:add-circle-outline" className="w-5 h-5 text-blue-600" />
                          <span className="flex-1">{course.title}</span>
                          {!course.published && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Draft</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowCoursesModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveCourses} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Courses'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Enroll Students Modal */}
          {showEnrollModal && selectedProgramme && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">Enroll Students: {selectedProgramme.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">Search and enroll students in this programme</p>
                </div>
                <div className="p-6">
                  {/* Current Enrollments */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Current Enrollments ({enrollments.filter(e => e.status === 'active').length})
                    </h3>
                    {loadingEnrollments ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : enrollments.filter(e => e.status === 'active').length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No students enrolled yet</p>
                    ) : (
                      <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                        {enrollments.filter(e => e.status === 'active').map(enrollment => (
                          <div key={enrollment.id} className="flex items-center gap-3 p-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              {enrollment.student?.avatar ? (
                                <img src={enrollment.student.avatar} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <Icon icon="material-symbols:person" className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{enrollment.student?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500 truncate">{enrollment.student?.email}</div>
                            </div>
                            <div className="text-right">
                              {enrollment.final_score !== null && enrollment.final_score !== undefined && (
                                <div className="text-sm font-medium">{enrollment.final_score.toFixed(1)}%</div>
                              )}
                              <div className="text-xs text-gray-500">
                                {new Date(enrollment.enrolled_at).toLocaleDateString()}
                              </div>
                            </div>
                            <select
                              value={enrollment.status}
                              onChange={e => handleUpdateEnrollmentStatus(enrollment.student_id, e.target.value)}
                              className="text-xs px-2 py-1 border rounded"
                            >
                              <option value="active">Active</option>
                              <option value="completed">Completed</option>
                              <option value="withdrawn">Withdrawn</option>
                            </select>
                            <button
                              onClick={() => handleRemoveEnrollment(enrollment.student_id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Icon icon="material-symbols:close" className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Students */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Add Students</h3>
                    <div className="mb-3">
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      {filteredStudents.length === 0 ? (
                        <p className="text-sm text-gray-500 italic p-3">No students found</p>
                      ) : (
                        filteredStudents.slice(0, 50).map(student => (
                          <label
                            key={student.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(student.id)}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="rounded"
                            />
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              {student.avatar ? (
                                <img src={student.avatar} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <Icon icon="material-symbols:person" className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{student.name || 'No name'}</div>
                              <div className="text-xs text-gray-500 truncate">{student.email}</div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    {selectedStudentIds.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-blue-700">
                          {selectedStudentIds.length} student(s) selected
                        </span>
                        <Button className="text-sm px-3 py-1.5" onClick={handleEnrollStudents} disabled={saving}>
                          {saving ? 'Enrolling...' : 'Enroll Selected'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-6 border-t flex justify-end">
                  <Button variant="outline" onClick={() => setShowEnrollModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
