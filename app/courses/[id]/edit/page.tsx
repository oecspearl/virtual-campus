'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import RoleGuard from '@/app/components/RoleGuard';
import TextEditor from '@/app/components/editor/TextEditor';
import FileUpload from '@/app/components/file-upload/FileUpload';
import { useSupabase } from '@/lib/supabase-provider';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import CourseFormatSelector, { type CourseFormat } from '@/app/components/course/CourseFormatSelector';

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const courseId = id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [course, setCourse] = React.useState<any>(null);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [syllabus, setSyllabus] = React.useState('');
  const [thumbnail, setThumbnail] = React.useState('');
  const [published, setPublished] = React.useState(false);
  const [isPublic, setIsPublic] = React.useState(false);
  const [allowLessonPersonalisation, setAllowLessonPersonalisation] = React.useState(false);
  const [courseFormat, setCourseFormat] = React.useState<CourseFormat>('lessons');
  const [saving, setSaving] = React.useState(false);

  // Category state
  interface Category {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    color?: string;
    parent_id?: string | null;
    children?: Category[];
  }
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId] = React.useState<string | null>(null);

  // Load all categories
  const loadCategories = React.useCallback(async () => {
    try {
      const res = await fetch('/api/categories?flat=true&includeInactive=false');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  // Load course categories
  const loadCourseCategories = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/categories`);
      if (res.ok) {
        const data = await res.json();
        const cats = data.categories || [];
        setSelectedCategories(cats.map((c: { id: string }) => c.id));
        const primary = cats.find((c: { is_primary: boolean }) => c.is_primary);
        if (primary) {
          setPrimaryCategoryId(primary.id);
        }
      }
    } catch (error) {
      console.error('Error loading course categories:', error);
    }
  }, [courseId]);

  const load = React.useCallback(async () => {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No session found for loading course:', sessionError);
        alert('You must be logged in to load the course.');
        return;
      }

      const cRes = await fetch(`/api/courses/${courseId}`, { 
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!cRes.ok) {
        console.error('Failed to load course:', cRes.status, cRes.statusText);
        const errorData = await cRes.json().catch(() => ({}));
        console.error('Error data:', errorData);
        alert(`Failed to load course: ${errorData.error || `HTTP ${cRes.status}: ${cRes.statusText}`}`);
        return;
      }
      
      const cData = await cRes.json();
      console.log('Course loaded successfully:', cData);
      setCourse(cData);
      setTitle(cData.title||'');
      setDescription(cData.description||'');
      setSyllabus(cData.syllabus||'');
      setThumbnail(cData.thumbnail||'');
      setPublished(Boolean(cData.published));
      setIsPublic(Boolean(cData.is_public));
      setAllowLessonPersonalisation(Boolean(cData.allow_lesson_personalisation));
      setCourseFormat(cData.course_format || 'lessons');
    } catch (error) {
      console.error('Error loading course:', error);
      alert('Failed to load course. Please refresh the page.');
    }
  }, [courseId, supabase]);

  React.useEffect(() => {
    load();
    loadCategories();
    loadCourseCategories();
  }, [load, loadCategories, loadCourseCategories]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        // Removing category - also clear primary if it was this one
        if (primaryCategoryId === categoryId) {
          setPrimaryCategoryId(null);
        }
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const save = async () => {
    setSaving(true);
    console.log('Saving course with ID:', courseId);
    console.log('Course object:', course);
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No session found:', sessionError);
        alert('You must be logged in to save the course.');
        setSaving(false);
        return;
      }

      const response = await fetch(`/api/courses/${courseId}`, { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }, 
        body: JSON.stringify({
          title,
          description,
          syllabus,
          published,
          is_public: isPublic,
          allow_lesson_personalisation: allowLessonPersonalisation,
          thumbnail,
          course_format: courseFormat,
          grade_level: course.grade_level,
          subject_area: course.subject_area,
          difficulty: course.difficulty
        })
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response statusText:', response.statusText);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('Save failed:', errorData);
        console.error('Response status:', response.status);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        alert(`Failed to save course: ${errorData.error || `HTTP ${response.status}: ${response.statusText}`}`);
        return;
      }
      
      console.log('Save successful!');

      // Save category assignments
      if (selectedCategories.length > 0 || primaryCategoryId) {
        const catRes = await fetch(`/api/courses/${courseId}/categories`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            category_ids: selectedCategories,
            primary_category_id: primaryCategoryId
          })
        });

        if (!catRes.ok) {
          console.error('Failed to save categories');
        }
      }

      // Show success message
      alert('Course saved successfully!');

      await load();
      await loadCourseCategories();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save course. Please try again.');
    } finally { 
      setSaving(false); 
    }
  };


  if (!course) return null;

  return (
    <RoleGuard roles={["instructor","curriculum_designer","admin","super_admin"]} fallback={<div className="mx-auto max-w-2xl px-4 py-8"><p className="text-sm text-gray-700"><span>Access denied.</span></p></div>}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Courses', href: '/courses' },
            { label: course?.title || 'Course', href: `/course/${courseId}` },
            { label: 'Edit' },
          ]}
          className="mb-6"
        />
        <h1 className="text-2xl font-medium text-gray-900"><span>Edit Course</span></h1>

        <div className="mt-4 max-w-2xl">
          <div className="space-y-6">
            <div>
              <label className="text-xs text-gray-600"><span>Title</span></label>
              <input value={title} onChange={(e)=>setTitle(e.target.value)} className="mt-1 w-full rounded-md border bg-white p-2 text-sm text-gray-700" />
            </div>
            
            <div>
              <label className="text-xs text-gray-600"><span>Description</span></label>
              <textarea value={description} onChange={(e)=>setDescription(e.target.value)} className="mt-1 w-full rounded-md border bg-white p-2 text-sm text-gray-700" rows={4} />
            </div>
            
            <div>
              <label className="text-xs text-gray-600"><span>Course Thumbnail</span></label>
              {thumbnail && (
                <div className="mt-2 mb-4">
                  <img 
                    src={thumbnail} 
                    alt="Course thumbnail" 
                    className="h-48 w-full rounded-lg object-cover border"
                  />
                </div>
              )}
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6">
                <FileUpload onUploaded={(res) => setThumbnail(res.fileUrl)} />
                <p className="text-sm text-gray-500 mt-2">
                  Upload an image to represent your course (optional)
                </p>
              </div>
            </div>
            
            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <label className="text-xs text-gray-600"><span>Categories</span></label>
                <p className="text-xs text-gray-500 mb-2">Select categories for this course. Choose one as primary.</p>
                <div className="mt-1 border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {categories.map(category => (
                    <div key={category.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`cat-${category.id}`}
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`cat-${category.id}`} className="flex-1 text-sm text-gray-700 cursor-pointer">
                        {category.name}
                      </label>
                      {selectedCategories.includes(category.id) && (
                        <button
                          type="button"
                          onClick={() => setPrimaryCategoryId(category.id)}
                          className={`text-xs px-2 py-0.5 rounded ${
                            primaryCategoryId === category.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {primaryCategoryId === category.id ? 'Primary' : 'Set Primary'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-600 block mb-1"><span>Course Format</span></label>
              <CourseFormatSelector
                currentFormat={courseFormat}
                onFormatChange={setCourseFormat}
                saving={saving}
              />
            </div>

            <div>
              <label className="text-xs text-gray-600"><span>Syllabus</span></label>
              <div className="mt-1"><TextEditor value={syllabus} onChange={setSyllabus} /></div>
            </div>
            
            <div className="flex items-center gap-2">
              <input id="pub" type="checkbox" checked={published} onChange={(e)=>setPublished(e.target.checked)} />
              <label htmlFor="pub" className="text-xs text-gray-700"><span>Published</span></label>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <input
                  id="is_public"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <label htmlFor="is_public" className="text-xs font-medium text-amber-900">
                  <span>Public course (anyone can view)</span>
                </label>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                Makes lessons and materials readable by anyone, including unauthenticated visitors.
                Submissions, quiz attempts, and discussion posts still require enrollment.
              </p>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <input
                  id="allow_lesson_personalisation"
                  type="checkbox"
                  checked={allowLessonPersonalisation}
                  onChange={(e) => setAllowLessonPersonalisation(e.target.checked)}
                />
                <label htmlFor="allow_lesson_personalisation" className="text-xs font-medium text-indigo-900">
                  <span>Allow lessons to be used in Personalised Course Builder</span>
                </label>
              </div>
              <p className="text-[11px] text-indigo-800 leading-snug">
                When on, learners can pick this course&apos;s individual lessons and have them
                assembled — alongside lessons from other courses — into a custom learning path.
                Only takes effect if your institution has the Personalised Course Builder feature enabled.
              </p>
            </div>


            <div className="flex gap-4">
              <Button onClick={save} disabled={saving}>
                <span>{saving? 'Saving…':'Save Course'}</span>
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>
                <span>Cancel</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
