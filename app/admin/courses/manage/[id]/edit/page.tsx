'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import RoleGuard from '@/app/components/RoleGuard';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import CourseForm, { CourseFormValues, EMPTY_COURSE_FORM } from '../../_components/CourseForm';

export default function EditCoursePage() {
  const { id: courseId } = useParams<{ id: string }>();
  const router = useRouter();
  const { supabase } = useSupabase();

  const [form, setForm] = useState<CourseFormValues>(EMPTY_COURSE_FORM);
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function getToken() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('You must be logged in.');
    return session.access_token;
  }

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load course');
        const course = await res.json();

        setCourseTitle(course.title);
        setForm({
          title: course.title || '',
          description: course.description || '',
          thumbnail: course.thumbnail || '',
          grade_level: course.grade_level || '',
          subject_area: course.subject_area || '',
          difficulty: course.difficulty || 'beginner',
          modality: course.modality || 'self_paced',
          estimated_duration: course.estimated_duration || '',
          syllabus: course.syllabus || '',
          published: course.published || false,
          featured: course.featured || false,
          course_format: course.course_format || 'lessons',
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load course');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const token = await getToken();
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save course');
      }
      setSuccess('Course updated successfully!');
      setCourseTitle(form.title);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-gray-200 rounded w-48" />
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-40 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard roles={['admin', 'super_admin', 'curriculum_designer']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl space-y-6">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Manage Courses', href: '/admin/courses/manage' },
              { label: courseTitle || 'Edit Course' },
            ]}
          />

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-normal text-slate-900 tracking-tight">Edit Course</h1>
              <p className="text-gray-500 mt-1 text-sm">{courseTitle}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/courses/manage')}
              className="flex items-center gap-2"
            >
              <Icon icon="material-symbols:arrow-back" className="w-4 h-4" />
              Back to Courses
            </Button>
          </div>

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

          <div className="bg-white rounded-lg shadow p-6">
            <CourseForm
              values={form}
              onChange={setForm}
              onSubmit={handleSave}
              onCancel={() => router.push('/admin/courses/manage')}
              submitLabel={saving ? 'Saving...' : 'Save Changes'}
              loading={saving}
            />
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
