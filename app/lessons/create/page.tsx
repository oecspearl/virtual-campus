'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import Button from '@/app/components/Button';
import RoleGuard from '@/app/components/RoleGuard';

interface Course {
  id: string;
  title: string;
  description: string;
}

export default function CreateLessonPage() {
  const router = useRouter();
  const { user } = useSupabase();
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  // Check for course_id in URL params
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course_id');
    if (courseId) {
      setSelectedCourse(courseId);
    }
  }, []);

  // Form data
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    estimated_time: 30,
    difficulty: 2,
    learning_outcomes: [''],
    lesson_instructions: '',
    published: false
  });

  // Load courses
  React.useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
        if (!data.courses || data.courses.length === 0) {
          setError('No courses available. Please create a course first before creating lessons.');
        }
      } else {
        console.error('Failed to load courses:', response.status);
        setError('Failed to load courses. Please try again.');
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setError('Error loading courses. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };


  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLearningOutcomeChange = (index: number, value: string) => {
    const newOutcomes = [...formData.learning_outcomes];
    newOutcomes[index] = value;
    setFormData(prev => ({
      ...prev,
      learning_outcomes: newOutcomes
    }));
  };

  const addLearningOutcome = () => {
    setFormData(prev => ({
      ...prev,
      learning_outcomes: [...prev.learning_outcomes, '']
    }));
  };

  const removeLearningOutcome = (index: number) => {
    if (formData.learning_outcomes.length > 1) {
      const newOutcomes = formData.learning_outcomes.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        learning_outcomes: newOutcomes
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCourse) {
      setError('Please select a course');
      return;
    }

    if (!formData.title.trim()) {
      setError('Lesson title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course_id: selectedCourse,
          title: formData.title.trim(),
          description: formData.description.trim(),
          estimated_time: formData.estimated_time,
          difficulty: formData.difficulty,
          learning_outcomes: formData.learning_outcomes.filter(outcome => outcome.trim()),
          lesson_instructions: formData.lesson_instructions.trim(),
          content: [], // Empty content array - will be filled in editor
          resources: [], // Empty resources array - will be filled in editor
          published: formData.published
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to lesson editor
        router.push(`/lessons/${data.id}/edit`);
      } else {
        let errorMessage = 'Failed to create lesson';
        
        // Clone the response to avoid "body stream already read" error
        const responseClone = response.clone();
        
        try {
          const errorData = await response.json();
          console.error('Lesson creation error:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          
          // Try to get response text as fallback
          try {
            const responseText = await responseClone.text();
            console.error('Response text:', responseText);
            
            // Check if it's an HTML error page
            if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
              errorMessage = `Server error (${response.status}): The server returned an HTML error page instead of JSON. This usually means there's a server-side error.`;
            } else {
              errorMessage = `Server error (${response.status}): ${responseText || response.statusText}`;
            }
          } catch (textError) {
            console.error('Error getting response text:', textError);
            errorMessage = `Server error (${response.status}): ${response.statusText}`;
          }
        }
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error creating lesson:', error);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-oecs-light flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-oecs-red"></div>
          <p className="mt-2 text-body">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-oecs-light">
      <div className="container-custom section-padding">
        <RoleGuard 
          roles={["instructor", "curriculum_designer", "admin", "super_admin"]} 
          fallback={
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-card-title mb-2">Access Denied</h3>
              <p className="text-body">You don't have permission to create lessons.</p>
            </div>
          }
        >
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-section-title">Create New Lesson</h1>
              <p className="text-body mt-2">Add a new lesson directly to your course with rich content and materials</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="card">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                    required
                  >
                    <option value="">Choose a course...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">The lesson will be added directly to this course</p>
                </div>

                {/* Lesson Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter lesson title..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                    required
                  />
                </div>

                {/* Lesson Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe what students will learn in this lesson..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                  />
                </div>

                {/* Lesson Details Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Time (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={formData.estimated_time}
                      onChange={(e) => handleInputChange('estimated_time', parseInt(e.target.value) || 30)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty Level (1-5)
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => handleInputChange('difficulty', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                    >
                      <option value={1}>1 - Very Easy</option>
                      <option value={2}>2 - Easy</option>
                      <option value={3}>3 - Moderate</option>
                      <option value={4}>4 - Hard</option>
                      <option value={5}>5 - Very Hard</option>
                    </select>
                  </div>
                </div>

                {/* Learning Outcomes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Learning Outcomes
                  </label>
                  <div className="space-y-2">
                    {formData.learning_outcomes.map((outcome, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={outcome}
                          onChange={(e) => handleLearningOutcomeChange(index, e.target.value)}
                          placeholder={`Learning outcome ${index + 1}...`}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                        />
                        {formData.learning_outcomes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLearningOutcome(index)}
                            className="px-3 py-3 text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addLearningOutcome}
                      className="text-sm text-oecs-red hover:text-red-700 font-medium"
                    >
                      + Add Learning Outcome
                    </button>
                  </div>
                </div>

                {/* Lesson Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Instructions
                  </label>
                  <textarea
                    value={formData.lesson_instructions}
                    onChange={(e) => handleInputChange('lesson_instructions', e.target.value)}
                    placeholder="Provide instructions for students on how to complete this lesson..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                  />
                </div>

                {/* Publish Option */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    id="published"
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => handleInputChange('published', e.target.checked)}
                    className="h-4 w-4 text-oecs-red focus:ring-oecs-red border-gray-300 rounded"
                  />
                  <label htmlFor="published" className="text-sm font-medium text-gray-700">
                    Publish this lesson immediately
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={saving || !selectedCourse || !formData.title.trim()}
                    className="btn-primary flex-1"
                  >
                    {saving ? 'Creating Lesson...' : 'Create Lesson & Add Materials'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Next Steps Info */}
            <div className="mt-8 card bg-blue-50 border-blue-200">
              <h3 className="text-card-title text-blue-800 mb-2">What happens next?</h3>
              <p className="text-body text-blue-700">
                After creating the lesson, you'll be taken to the lesson editor where you can add rich content including:
              </p>
              <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>Text content with rich formatting</li>
                <li>Video uploads and embeds</li>
                <li>File attachments (PDFs, documents, images)</li>
                <li>Interactive slideshows</li>
                <li>External content embeds</li>
                <li>Resource materials and references</li>
              </ul>
            </div>
          </div>
        </RoleGuard>
      </div>
    </div>
  );
}
