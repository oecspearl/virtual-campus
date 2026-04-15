"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import DateTimePicker from "@/app/components/ui/DateTimePicker";
import QuestionEditor, { type Question } from "@/app/components/quiz/QuestionEditor";
import Button from "@/app/components/ui/Button";
import AIQuizGenerator from "@/app/components/ai/AIQuizGenerator";
import QuizExtensionManager from "@/app/components/quiz/QuizExtensionManager";
import { ProctorSettings, DEFAULT_PROCTOR_SETTINGS } from "@/types/proctor";
import LoadingIndicator from "@/app/components/ui/LoadingIndicator";

interface QuizBuilderProps {
  quizId?: string;
  initialData?: any;
  mode?: 'create' | 'edit';
  onSave?: () => void;
}

export default function QuizBuilder({ 
  quizId, 
  initialData, 
  mode = 'create', 
  onSave 
}: QuizBuilderProps = {}) {
  const searchParams = useSearchParams();
  const urlLessonId = searchParams.get('lesson_id');
  
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [timeLimit, setTimeLimit] = React.useState<number | null>(null);
  const [attempts, setAttempts] = React.useState(1);
  const [points, setPoints] = React.useState(100);
  const [published, setPublished] = React.useState(false);
  const [randQ, setRandQ] = React.useState(false);
  const [randA, setRandA] = React.useState(false);
  const [showCorrect, setShowCorrect] = React.useState(false);
  const [feedbackMode, setFeedbackMode] = React.useState("after_submit");
  const [dueDate, setDueDate] = React.useState<string | null>(null);
  const [availableFrom, setAvailableFrom] = React.useState<string | null>(null);
  const [availableUntil, setAvailableUntil] = React.useState<string | null>(null);
  const [proctoredMode, setProctoredMode] = React.useState(false);
  const [proctorSettings, setProctorSettings] = React.useState<ProctorSettings>(DEFAULT_PROCTOR_SETTINGS);
  const [showInCurriculum, setShowInCurriculum] = React.useState(false);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [loading, setLoading] = React.useState(mode === 'edit');
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = React.useState<string | null>(null);
  const [showAIGenerator, setShowAIGenerator] = React.useState(false);

  // Course and lesson selection
  const [courses, setCourses] = React.useState<Array<{ id: string; title: string }>>([]);
  const [lessons, setLessons] = React.useState<Array<{ id: string; title: string; course_id: string }>>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<string>("");
  const [selectedLesson, setSelectedLesson] = React.useState<string>(urlLessonId || "");
  const [loadingCourses, setLoadingCourses] = React.useState(false);
  const [loadingLessons, setLoadingLessons] = React.useState(false);

  // Load courses on mount
  React.useEffect(() => {
    loadCourses();
  }, []);

  // Load lessons when course is selected or when lesson_id is in URL
  React.useEffect(() => {
    if (selectedCourse) {
      loadLessons(selectedCourse);
    } else if (urlLessonId) {
      // If we have a lesson_id from URL, try to get its course_id first
      loadLessonAndCourse(urlLessonId);
    }
  }, [selectedCourse, urlLessonId]);

  // Initialize form with existing data in edit mode
  React.useEffect(() => {
    if (mode === 'edit' && initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setInstructions(initialData.instructions || "");
      setTimeLimit(initialData.time_limit);
      setAttempts(initialData.attempts_allowed || 1);
      setPoints(initialData.points || 100);
      setPublished(initialData.published || false);
      setRandQ(initialData.randomize_questions || false);
      setRandA(initialData.randomize_answers || false);
      setShowCorrect(initialData.show_correct_answers || false);
      setFeedbackMode(initialData.show_feedback || "after_submit");
      setDueDate(initialData.due_date);
      setAvailableFrom(initialData.available_from);
      setAvailableUntil(initialData.available_until);
      setProctoredMode(initialData.proctored_mode === 'basic' || initialData.proctored_mode === 'strict' || initialData.proctored_mode === true);
      if (initialData.proctor_settings) {
        setProctorSettings({ ...DEFAULT_PROCTOR_SETTINGS, ...initialData.proctor_settings });
      }
      setShowInCurriculum(initialData.show_in_curriculum || false);
      setCreatedId(quizId || null);
      
      // Set course and lesson from initial data
      if (initialData.course_id) {
        setSelectedCourse(initialData.course_id);
      }
      if (initialData.lesson_id) {
        setSelectedLesson(initialData.lesson_id);
      }
      
      setLoading(false);
    }
  }, [mode, initialData, quizId]);

  async function loadCourses() {
    setLoadingCourses(true);
    try {
      const response = await fetch('/api/courses');
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoadingCourses(false);
    }
  }

  async function loadLessons(courseId: string) {
    setLoadingLessons(true);
    try {
      const response = await fetch(`/api/lessons?course_id=${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
      }
    } catch (error) {
      console.error('Error loading lessons:', error);
    } finally {
      setLoadingLessons(false);
    }
  }

  async function loadLessonAndCourse(lessonId: string) {
    try {
      const response = await fetch(`/api/lessons/${lessonId}`);
      if (response.ok) {
        const lesson = await response.json();
        if (lesson && lesson.course_id) {
          setSelectedCourse(lesson.course_id);
          setSelectedLesson(lessonId);
          // Load lessons for this course
          await loadLessons(lesson.course_id);
        }
      }
    } catch (error) {
      console.error('Error loading lesson:', error);
    }
  }

  // Load existing questions in edit mode
  React.useEffect(() => {
    if (mode === 'edit' && quizId && !loading) {
      loadExistingQuestions();
    }
  }, [mode, quizId, loading]);

  async function loadExistingQuestions() {
    try {
      const response = await fetch(`/api/quizzes/${quizId}/questions`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  }

  function addQuestion() {
    setQuestions((q) => [
      ...q,
      { type: "multiple_choice", question_text: "", points: 1, order: q.length, options: [], feedback_correct: "", feedback_incorrect: "" },
    ]);
  }

  function handleAIGeneratedQuestions(generatedQuestions: any[]) {
    // Convert AI-generated questions to the Question format
    // IMPORTANT: Add unique IDs to each option for grading to work
    const newQuestions: Question[] = generatedQuestions.map((q, idx) => ({
      type: q.type,
      question_text: q.question_text,
      points: q.points || 1,
      order: questions.length + idx,
      options: (q.options || []).map((opt: any, optIdx: number) => ({
        id: opt.id || crypto.randomUUID(), // Ensure each option has a unique ID
        text: opt.text || '',
        is_correct: Boolean(opt.is_correct)
      })),
      feedback_correct: q.feedback_correct || "",
      feedback_incorrect: q.feedback_incorrect || ""
    }));

    setQuestions(prev => [...prev, ...newQuestions]);
    setShowAIGenerator(false);
  }

  function copyQuizId() {
    if (createdId) {
      navigator.clipboard.writeText(createdId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    console.log('[QuizBuilder] ===== handleCsvUpload CALLED =====');
    console.log('[QuizBuilder] Event:', event);
    console.log('[QuizBuilder] Files:', event.target.files);
    
    const file = event.target.files?.[0];
    if (!file) {
      console.error('[QuizBuilder] No file selected');
      alert('No file selected. Please choose a CSV file.');
      return;
    }

    console.log('[QuizBuilder] CSV upload started:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      selectedCourse,
      selectedLesson
    });

    // Validate that a course is selected
    if (!selectedCourse) {
      console.error('[QuizBuilder] No course selected');
      const errorMsg = 'Please select a course before uploading a CSV file.';
      alert(errorMsg);
      setUploadError(errorMsg);
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('csv', file);
      if (selectedLesson) {
        formData.append('lesson_id', selectedLesson);
      }
      if (selectedCourse) {
        formData.append('course_id', selectedCourse);
      }
      // Include the title from the form if it's been entered
      if (title && title.trim()) {
        formData.append('title', title.trim());
      }

      console.log('[QuizBuilder] Sending POST request to /api/quizzes/upload');
      const response = await fetch('/api/quizzes/upload', {
        method: 'POST',
        body: formData
      });

      console.log('[QuizBuilder] Response status:', response.status);
      console.log('[QuizBuilder] Response ok:', response.ok);
      
      let result;
      const contentType = response.headers.get('content-type');
      console.log('[QuizBuilder] Response content-type:', contentType);
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        console.log('[QuizBuilder] Response result:', result);
      } else {
        const text = await response.text();
        console.error('[QuizBuilder] Non-JSON response:', text.substring(0, 500));
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        const errorMsg = result?.details || result?.error || `Server error: ${response.status} ${response.statusText}`;
        console.error('[QuizBuilder] Upload failed:', errorMsg);
        throw new Error(errorMsg);
      }

      if (result.success) {
        setUploadSuccess(`Quiz "${result.quiz.title}" created successfully with ${result.questionsCreated} questions!`);
        setCreatedId(result.quiz.id);
        
        // Update form fields with the quiz data from CSV to prevent duplicate creation
        // and show the user what was created
        if (result.quiz) {
          setTitle(result.quiz.title || title);
          setDescription(result.quiz.description || description);
          setInstructions(result.quiz.instructions || instructions);
          setTimeLimit(result.quiz.time_limit || timeLimit);
          setAttempts(result.quiz.attempts_allowed || attempts);
          setPoints(result.quiz.points || points);
          setPublished(result.quiz.published ?? published);
          setRandQ(result.quiz.randomize_questions ?? randQ);
          setRandA(result.quiz.randomize_answers ?? randA);
          setShowCorrect(result.quiz.show_correct_answers ?? showCorrect);
          setFeedbackMode(result.quiz.show_feedback || feedbackMode);
          setDueDate(result.quiz.due_date || dueDate);
          setAvailableFrom(result.quiz.available_from || availableFrom);
          setAvailableUntil(result.quiz.available_until || availableUntil);
        }
        
        // If there were errors, show them
        if (result.errors && result.errors.length > 0) {
          const errorMessages = result.errors.map((e: any) => `Row ${e.row}: ${e.message}`).join('\n');
          setUploadError(`Some questions had errors:\n${errorMessages}`);
        }

        // Load questions for the newly created quiz
        if (result.quiz.id) {
          console.log('[QuizBuilder] Loading questions for newly created quiz:', result.quiz.id);
          // Set quizId temporarily to load questions
          const originalQuizId = quizId;
          // Use the new quiz ID to load questions
          try {
            const questionsResponse = await fetch(`/api/quizzes/${result.quiz.id}/questions`);
            if (questionsResponse.ok) {
              const questionsData = await questionsResponse.json();
              console.log('[QuizBuilder] Questions API response:', questionsData);
              // Handle both formats: direct array or { questions: [...] }
              const questionsArray = Array.isArray(questionsData) 
                ? questionsData 
                : (questionsData.questions || []);
              console.log('[QuizBuilder] Loaded questions count:', questionsArray.length);
              setQuestions(questionsArray);
            } else {
              console.error('[QuizBuilder] Failed to load questions:', questionsResponse.status);
            }
          } catch (error) {
            console.error('[QuizBuilder] Error loading questions:', error);
          }
        }

        // Reload questions if in edit mode
        if (mode === 'edit' && result.quiz.id) {
          await loadExistingQuestions();
        }

        // Call onSave callback if provided
        if (onSave) {
          onSave();
        }
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload quiz');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  }

  async function save() {
    // If a quiz was already created via CSV upload, update it instead of creating a new one
    if (mode === 'create' && createdId) {
      // Quiz was already created via CSV, so update it instead
      const updateRes = await fetch(`/api/quizzes/${createdId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: selectedLesson || initialData?.lesson_id || null,
          course_id: selectedCourse || initialData?.course_id || null,
          title,
          description,
          instructions,
          time_limit: timeLimit,
          attempts_allowed: attempts,
          points,
          published,
          randomize_questions: randQ,
          randomize_answers: randA,
          show_correct_answers: showCorrect,
          show_feedback: feedbackMode,
          due_date: dueDate,
          available_from: availableFrom,
          available_until: availableUntil,
          proctored_mode: proctoredMode ? 'basic' : 'none',
          proctor_settings: proctoredMode ? proctorSettings : null,
          show_in_curriculum: showInCurriculum
        })
      });
      
      if (!updateRes.ok) {
        const errorData = await updateRes.json();
        alert(`Failed to update quiz: ${errorData.error || 'Unknown error'}`);
        return;
      }
      
      // Update questions for the existing quiz
      try {
        await updateQuestions(createdId);
      } catch (err: any) {
        console.error('Error updating questions:', err);
        alert(`Failed to update questions: ${err.message || 'Unknown error'}`);
        setSaving(false);
        return;
      }

      if (onSave) {
        onSave();
      } else {
        alert('Quiz updated successfully!');
      }
      setSaving(false);
      return;
    }

    // Validate course is selected (only for create mode, or if course was changed in edit mode)
    if (mode === 'create' && !selectedCourse) {
      alert('Please select a course before saving the quiz.');
      return;
    }

    // In edit mode, use existing course_id if no course is selected
    const courseIdToUse = selectedCourse || initialData?.course_id || null;
    if (mode === 'edit' && !courseIdToUse) {
      alert('Quiz must be associated with a course. Please select a course.');
      return;
    }

    setSaving(true);
    try {
      const quizData = {
        lesson_id: selectedLesson || initialData?.lesson_id || null,
        course_id: courseIdToUse,
        title,
        description,
        instructions,
        time_limit: timeLimit,
        attempts_allowed: attempts,
        points,
        published,
        randomize_questions: randQ,
        randomize_answers: randA,
        show_correct_answers: showCorrect,
        show_feedback: feedbackMode,
        due_date: dueDate,
        available_from: availableFrom,
        available_until: availableUntil,
        proctored_mode: proctoredMode,
        proctor_settings: proctoredMode ? proctorSettings : null,
        show_in_curriculum: showInCurriculum
      };

      let currentQuizId = quizId;

      if (mode === 'create') {
        // Create new quiz
        const res = await fetch("/api/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quizData)
        });
        if (!res.ok) {
          const errorData = await res.json();
          alert(`Failed to create quiz: ${errorData.error || 'Unknown error'}`);
          return;
        }
        const data = await res.json();
        currentQuizId = data.id as string;
        setCreatedId(currentQuizId);
      } else {
        // Update existing quiz
        const res = await fetch(`/api/quizzes/${quizId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quizData)
        });
        if (!res.ok) {
          const errorData = await res.json();
          alert(`Failed to update quiz: ${errorData.error || 'Unknown error'}`);
          return;
        }
      }

      // Handle questions
      if (mode === 'edit' && currentQuizId) {
        // In edit mode, update questions (create, update, or delete)
        await updateQuestions(currentQuizId);
      } else if (mode === 'create' && currentQuizId) {
        // Create new questions
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          // Remove id field for new questions
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { id, ...questionData } = q as any;
          const body: any = { ...questionData, order: i };
          
          const res = await fetch(`/api/quizzes/${encodeURIComponent(currentQuizId)}/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            console.error('Failed to create question:', errorData);
            throw new Error(`Failed to create question: ${errorData.error || 'Unknown error'}`);
          }
        }
      }

      if (onSave) {
        onSave();
      } else if (mode === 'create') {
        // Show success message for new quiz
        alert('Quiz saved successfully!');
      } else {
        // Show success message for edited quiz
        alert('Quiz updated successfully!');
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert(`Failed to save quiz: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateQuestions(quizId: string) {
    try {
      // First, get all existing questions for this quiz
      const existingQuestionsRes = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/questions`);
      if (!existingQuestionsRes.ok) {
        throw new Error('Failed to fetch existing questions');
      }
      const existingQuestionsData = await existingQuestionsRes.json();
      const existingQuestions = existingQuestionsData.questions || [];
      const existingQuestionIds = new Set(existingQuestions.map((q: any) => q.id));
      
      // Get IDs of questions that are still in the list
      const currentQuestionIds = new Set(questions.filter(q => q.id).map(q => q.id));
      
      // Delete questions that were removed
      const questionsToDelete = existingQuestions.filter((q: any) => !currentQuestionIds.has(q.id));
      for (const questionToDelete of questionsToDelete) {
        const deleteRes = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/questions/${questionToDelete.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" }
        });
        
        if (!deleteRes.ok) {
          const errorData = await deleteRes.json();
          console.error('Failed to delete question:', errorData);
          // Continue with other operations even if delete fails
        }
      }
      
      // Update or create questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        // Remove id field when creating new questions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { id, ...questionData } = q as any;
        const body: any = { ...questionData, order: i };
        
        // Only update if question has an id AND it exists in the database for this quiz
        if (q.id && existingQuestionIds.has(q.id)) {
          // Update existing question
          const updateRes = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/questions/${q.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          
          if (!updateRes.ok) {
            const errorData = await updateRes.json();
            console.error('Failed to update question:', errorData);
            throw new Error(`Failed to update question: ${errorData.error || 'Unknown error'}`);
          }
        } else {
          // Create new question (either no id, or id doesn't exist in database)
          const createRes = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          
          if (!createRes.ok) {
            const errorData = await createRes.json();
            console.error('Failed to create question:', errorData);
            throw new Error(`Failed to create question: ${errorData.error || 'Unknown error'}`);
          }
        }
      }
    } catch (error) {
      console.error('Error updating questions:', error);
      throw error; // Re-throw to be caught by save function
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <div className="flex items-center justify-center h-64">
          <LoadingIndicator variant="pencil" size="md" text="Loading quiz..." />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-gray-900">
          {mode === 'edit' ? 'Edit Quiz' : 'Create Quiz'}
        </h1>
        {urlLessonId && mode === 'create' && (
          <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
            Creating quiz for lesson: {urlLessonId}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Course Selection */}
        <div>
          <label className="mb-1 block text-xs text-gray-600">
            <span>Course <span className="text-red-500">*</span></span>
          </label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedLesson(""); // Reset lesson when course changes
            }}
            disabled={loadingCourses || !!urlLessonId}
            required
          >
            <option value="">{loadingCourses ? 'Loading courses...' : 'Select a course'}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          {!selectedCourse && mode === 'create' && (
            <p className="mt-1 text-xs text-red-600">A course is required to create a quiz</p>
          )}
        </div>

        {/* Lesson Selection */}
        <div>
          <label className="mb-1 block text-xs text-gray-600">
            <span>Lesson (Optional)</span>
          </label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            disabled={loadingLessons || !selectedCourse || !!urlLessonId}
          >
            <option value="">{loadingLessons ? 'Loading lessons...' : selectedCourse ? 'Select a lesson (optional)' : 'Select a course first'}</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
          {selectedCourse && lessons.length === 0 && !loadingLessons && (
            <p className="mt-1 text-xs text-gray-500">No lessons available in this course</p>
          )}
        </div>

        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="col-span-full rounded-md border px-3 py-2 text-sm" placeholder="Instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600"><span>Time limit (minutes)</span></label>
          <input type="number" className="w-24 rounded-md border px-2 py-1 text-sm" value={timeLimit ?? 0} onChange={(e) => setTimeLimit(Number(e.target.value) || null)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600"><span>Attempts</span></label>
          <input type="number" className="w-24 rounded-md border px-2 py-1 text-sm" value={attempts} onChange={(e) => setAttempts(Number(e.target.value))} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600"><span>Points</span></label>
          <input type="number" className="w-24 rounded-md border px-2 py-1 text-sm" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /><span>Published</span></label>
        <label className="flex items-center gap-2 text-xs text-gray-700" title="When enabled, this quiz will appear as a standalone item in the course curriculum alongside lessons">
          <input type="checkbox" checked={showInCurriculum} onChange={(e) => setShowInCurriculum(e.target.checked)} />
          <span>Show in Course Curriculum</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={randQ} onChange={(e) => setRandQ(e.target.checked)} /><span>Randomize questions</span></label>
        <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={randA} onChange={(e) => setRandA(e.target.checked)} /><span>Randomize answers</span></label>
        <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={showCorrect} onChange={(e) => setShowCorrect(e.target.checked)} /><span>Show correct answers</span></label>
        <select className="rounded-md border px-3 py-2 text-sm" value={feedbackMode} onChange={(e) => setFeedbackMode(e.target.value)}>
          <option value="immediately">Immediately</option>
          <option value="after_submit">After submit</option>
          <option value="never">Never</option>
        </select>
        <div>
          <label className="mb-1 block text-xs text-gray-600"><span>Due date</span></label>
          <DateTimePicker value={dueDate} onChange={setDueDate} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600"><span>Available from</span></label>
          <DateTimePicker value={availableFrom} onChange={setAvailableFrom} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600"><span>Available until</span></label>
          <DateTimePicker value={availableUntil} onChange={setAvailableUntil} />
        </div>
      </div>

      {/* Proctored Mode Section */}
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Safe Browser Mode (Proctoring)</h3>
            <p className="text-xs text-gray-600 mt-1">
              Enable to detect and prevent tab switching, window changes, and other potential cheating behaviors.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={proctoredMode}
              onChange={(e) => setProctoredMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {proctoredMode && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Max Violations Before Auto-Submit</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={proctorSettings.max_violations}
                  onChange={(e) => setProctorSettings({ ...proctorSettings, max_violations: parseInt(e.target.value) || 3 })}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={proctorSettings.fullscreen_required}
                    onChange={(e) => setProctorSettings({ ...proctorSettings, fullscreen_required: e.target.checked })}
                  />
                  <span>Require Fullscreen Mode</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={proctorSettings.block_right_click}
                  onChange={(e) => setProctorSettings({ ...proctorSettings, block_right_click: e.target.checked })}
                />
                <span>Block Right-Click</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={proctorSettings.block_keyboard_shortcuts}
                  onChange={(e) => setProctorSettings({ ...proctorSettings, block_keyboard_shortcuts: e.target.checked })}
                />
                <span>Block Keyboard Shortcuts</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={proctorSettings.auto_submit_on_violation}
                  onChange={(e) => setProctorSettings({ ...proctorSettings, auto_submit_on_violation: e.target.checked })}
                />
                <span>Auto-Submit on Max Violations</span>
              </label>
            </div>

            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Safe browser mode uses web-based detection. Students will see warnings when violations are detected.
                For high-stakes exams, consider combining this with webcam proctoring or a native lockdown browser.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Student Extensions - only in edit mode */}
      {mode === 'edit' && quizId && selectedCourse && (
        <QuizExtensionManager quizId={quizId} courseId={selectedCourse} />
      )}

      {mode === 'create' && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 bg-gray-50">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Import Quiz from CSV</h3>
            <p className="text-xs text-gray-600 mb-4">
              Upload a CSV file to create a quiz with questions. 
              <a href="/quiz-csv-template.csv" download className="text-blue-600 hover:underline ml-1">
                Download template
              </a>
            </p>
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                disabled={uploading}
                className="hidden"
              />
              <span>{uploading ? 'Uploading...' : 'Choose CSV File'}</span>
            </label>
            {uploadError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 whitespace-pre-line">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                {uploadSuccess}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Questions</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowAIGenerator(true)}
              className="flex items-center gap-2"
            >
              <Icon icon="material-symbols:auto-awesome" className="w-4 h-4" />
              <span>AI Generate</span>
            </Button>
            <Button onClick={addQuestion}><span>Add question</span></Button>
          </div>
        </div>
        {questions.map((q, idx) => (
          <QuestionEditor key={idx} value={q} onChange={(newQ) => setQuestions(questions.map((qq, i) => (i === idx ? newQ : qq)))} onRemove={() => setQuestions(questions.filter((_, i) => i !== idx))} />
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={save} disabled={saving}><span>{saving ? (mode === 'edit' ? "Updating..." : "Saving...") : (mode === 'edit' ? "Update Quiz" : "Create Quiz")}</span></Button>
        {createdId && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <strong>Quiz ID:</strong>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs ml-2">{createdId}</code>
              <button
                onClick={copyQuizId}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                title="Copy to clipboard"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <a className="text-sm text-[#3B82F6] underline" href={`/quiz/${createdId}/attempt`}>
              <span>Open attempt page</span>
            </a>
          </div>
        )}
      </div>

      {/* AI Quiz Generator Modal */}
      {showAIGenerator && (
        <AIQuizGenerator
          lessonId={selectedLesson || undefined}
          lessonTitle={lessons.find(l => l.id === selectedLesson)?.title}
          courseId={selectedCourse || undefined}
          onQuestionsGenerated={handleAIGeneratedQuestions}
          onClose={() => setShowAIGenerator(false)}
        />
      )}
    </div>
  );
}
