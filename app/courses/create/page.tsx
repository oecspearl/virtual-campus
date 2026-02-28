'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';
import TextEditor from '@/app/components/TextEditor';
import FileUpload, { UploadResult } from '@/app/components/FileUpload';
import RoleGuard from '@/app/components/RoleGuard';
import MoodleImportButton from '@/app/components/MoodleImportButton';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  parent_id: string | null;
}

export default function CreateCoursePage() {
  const router = useRouter();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [thumbnail, setThumbnail] = React.useState<string|undefined>(undefined);
  const [grade, setGrade] = React.useState('');
  const [difficulty, setDifficulty] = React.useState('beginner');
  const [syllabus, setSyllabus] = React.useState('');
  const [published, setPublished] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = React.useState<string>('');

  // Load categories on mount
  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch('/api/categories?flat=true');
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  const save = async () => {
    if (!title.trim()) {
      setError('Course title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          thumbnail,
          grade_level: grade.trim(),
          difficulty,
          syllabus,
          published
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to create course');
        return;
      }

      const data = await res.json();

      // Assign categories if any selected
      if (selectedCategories.length > 0) {
        await fetch(`/api/courses/${data.id}/categories`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_ids: selectedCategories,
            primary_category_id: primaryCategory || selectedCategories[0]
          })
        });
      }

      router.push(`/course/${data.id}`);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const onUploaded = (res: UploadResult) => {
    const src = `/api/files/${res.fileId}`;
    setThumbnail(src);
  };

  return (
    <div className="min-h-screen bg-oecs-light">
      <div className="container-custom section-padding">
        <RoleGuard 
          roles={["instructor","curriculum_designer","admin","super_admin"]} 
          fallback={
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-card-title mb-2">Access Denied</h3>
              <p className="text-body">You don't have permission to create courses.</p>
            </div>
          }
        >
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-section-title">Create New Course</h1>
                  <p className="text-body mt-2">Design and publish a new course for OECS Virtual Campus</p>
                </div>
                <MoodleImportButton 
                  onImportComplete={(courseId) => {
                    router.push(`/course/${courseId}`);
                  }}
                />
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Have a course backup or Moodle export? Use the "Import Course" button to quickly import your course structure and content.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="card">
              <div className="space-y-6">
                {/* Course Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Title <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Enter course title..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                    required
                  />
                </div>

                {/* Course Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Description
                  </label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Describe what students will learn in this course..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                  />
                </div>

                {/* Course Details Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade Level
                    </label>
                    <input
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="e.g., Grade 7, High School"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty Level
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                {/* Course Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Categories
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Select one or more categories for this course. The primary category will be featured.
                  </p>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No categories available</p>
                    ) : (
                      <div className="space-y-2">
                        {categories.map(cat => (
                          <label
                            key={cat.id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedCategories.includes(cat.id)
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(cat.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategories([...selectedCategories, cat.id]);
                                  if (!primaryCategory) setPrimaryCategory(cat.id);
                                } else {
                                  setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                                  if (primaryCategory === cat.id) {
                                    const remaining = selectedCategories.filter(id => id !== cat.id);
                                    setPrimaryCategory(remaining[0] || '');
                                  }
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${cat.color}20` }}
                            >
                              <Icon icon={cat.icon} className="w-4 h-4" style={{ color: cat.color }} />
                            </div>
                            <span className={`flex-1 ${cat.parent_id ? 'ml-4' : 'font-medium'}`}>
                              {cat.parent_id && '└ '}{cat.name}
                            </span>
                            {selectedCategories.includes(cat.id) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPrimaryCategory(cat.id);
                                }}
                                className={`text-xs px-2 py-1 rounded ${
                                  primaryCategory === cat.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {primaryCategory === cat.id ? 'Primary' : 'Set Primary'}
                              </button>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCategories.length > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      {selectedCategories.length} category(ies) selected
                    </p>
                  )}
                </div>

                {/* Course Thumbnail */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Thumbnail
                  </label>
                  {thumbnail && (
                    <div className="mb-4">
                      <img 
                        src={thumbnail} 
                        alt="Course thumbnail" 
                        className="h-48 w-full rounded-lg object-cover border"
                      />
                    </div>
                  )}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <FileUpload onUploaded={onUploaded} />
                    <p className="text-sm text-gray-500 mt-2">
                      Upload an image to represent your course (optional)
                    </p>
                  </div>
                </div>

                {/* Course Syllabus */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Syllabus
                  </label>
                  <div className="border border-gray-300 rounded-lg">
                    <TextEditor value={syllabus} onChange={setSyllabus} />
                  </div>
                </div>

                {/* Publish Option */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input 
                    id="published" 
                    type="checkbox" 
                    checked={published} 
                    onChange={(e) => setPublished(e.target.checked)}
                    className="h-4 w-4 text-oecs-red focus:ring-oecs-red border-gray-300 rounded"
                  />
                  <label htmlFor="published" className="text-sm font-medium text-gray-700">
                    Publish this course immediately
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t">
                  <Button 
                    onClick={save} 
                    disabled={saving || !title.trim()} 
                    className="btn-primary flex-1"
                  >
                    {saving ? 'Creating Course...' : 'Create Course'}
                  </Button>
                  <button 
                    onClick={() => router.back()} 
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </RoleGuard>
      </div>
    </div>
  );
}
