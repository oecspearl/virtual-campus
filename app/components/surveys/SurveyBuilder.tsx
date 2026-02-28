"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import DateTimePicker from "@/app/components/DateTimePicker";
import Button from "@/app/components/Button";
import SurveyQuestionEditor, { type SurveyQuestion } from "./SurveyQuestionEditor";
import AISurveyGenerator from "./AISurveyGenerator";
import SurveyCSVUpload from "./SurveyCSVUpload";
import SurveyTemplates from "./SurveyTemplates";

interface SurveyBuilderProps {
  surveyId?: string;
  initialData?: any;
  mode?: 'create' | 'edit';
  onSave?: () => void;
}

const SURVEY_TYPES = [
  { value: 'course_evaluation', label: 'Course Evaluation' },
  { value: 'lesson_feedback', label: 'Lesson Feedback' },
  { value: 'instructor_evaluation', label: 'Instructor Evaluation' },
  { value: 'nps', label: 'Net Promoter Score (NPS)' },
  { value: 'custom', label: 'Custom Survey' }
];

export default function SurveyBuilder({
  surveyId,
  initialData,
  mode = 'create',
  onSave
}: SurveyBuilderProps = {}) {
  const searchParams = useSearchParams();
  const urlLessonId = searchParams.get('lesson_id');
  const urlCourseId = searchParams.get('course_id');

  // Survey settings
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [surveyType, setSurveyType] = React.useState("course_evaluation");
  const [isAnonymous, setIsAnonymous] = React.useState(true);
  const [allowMultipleResponses, setAllowMultipleResponses] = React.useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = React.useState(false);
  const [showProgressBar, setShowProgressBar] = React.useState(true);
  const [thankYouMessage, setThankYouMessage] = React.useState("Thank you for completing this survey!");
  const [published, setPublished] = React.useState(false);
  const [availableFrom, setAvailableFrom] = React.useState<string | null>(null);
  const [availableUntil, setAvailableUntil] = React.useState<string | null>(null);

  // Questions
  const [questions, setQuestions] = React.useState<SurveyQuestion[]>([]);

  // UI state
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(mode === 'edit');
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [showAIGenerator, setShowAIGenerator] = React.useState(false);
  const [showCSVUpload, setShowCSVUpload] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(false);

  // Course and lesson selection
  const [courses, setCourses] = React.useState<Array<{ id: string; title: string }>>([]);
  const [lessons, setLessons] = React.useState<Array<{ id: string; title: string; course_id: string }>>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<string>(urlCourseId || "");
  const [selectedLesson, setSelectedLesson] = React.useState<string>(urlLessonId || "");
  const [loadingCourses, setLoadingCourses] = React.useState(false);
  const [loadingLessons, setLoadingLessons] = React.useState(false);

  // Load courses on mount
  React.useEffect(() => {
    loadCourses();
  }, []);

  // Load lessons when course is selected
  React.useEffect(() => {
    if (selectedCourse) {
      loadLessons(selectedCourse);
    } else if (urlLessonId) {
      loadLessonAndCourse(urlLessonId);
    }
  }, [selectedCourse, urlLessonId]);

  // Initialize form with existing data in edit mode
  React.useEffect(() => {
    if (mode === 'edit' && initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setInstructions(initialData.instructions || "");
      setSurveyType(initialData.survey_type || "course_evaluation");
      setIsAnonymous(initialData.is_anonymous ?? true);
      setAllowMultipleResponses(initialData.allow_multiple_responses || false);
      setRandomizeQuestions(initialData.randomize_questions || false);
      setShowProgressBar(initialData.show_progress_bar ?? true);
      setThankYouMessage(initialData.thank_you_message || "Thank you for completing this survey!");
      setPublished(initialData.published || false);
      setAvailableFrom(initialData.available_from);
      setAvailableUntil(initialData.available_until);
      setCreatedId(surveyId || null);

      if (initialData.course_id) {
        setSelectedCourse(initialData.course_id);
      }
      if (initialData.lesson_id) {
        setSelectedLesson(initialData.lesson_id);
      }

      // Load questions
      if (initialData.survey_questions) {
        setQuestions(initialData.survey_questions);
      }

      setLoading(false);
    }
  }, [mode, initialData, surveyId]);

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
          await loadLessons(lesson.course_id);
        }
      }
    } catch (error) {
      console.error('Error loading lesson:', error);
    }
  }

  function addQuestion() {
    setQuestions((q) => [
      ...q,
      {
        type: "likert_scale",
        question_text: "",
        description: "",
        required: true,
        order: q.length,
        options: {
          min: 1,
          max: 5,
          labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
        },
        category: ""
      }
    ]);
  }

  function handleAIGeneratedQuestions(generatedQuestions: any[]) {
    const newQuestions: SurveyQuestion[] = generatedQuestions.map((q, idx) => ({
      type: q.type || 'likert_scale',
      question_text: q.question_text || '',
      description: q.description || '',
      required: q.required !== false,
      order: questions.length + idx,
      options: q.options || null,
      category: q.category || ''
    }));

    setQuestions(prev => [...prev, ...newQuestions]);
    setShowAIGenerator(false);
  }

  function handleTemplateSelect(template: any) {
    if (template.questions) {
      const newQuestions: SurveyQuestion[] = template.questions.map((q: any, idx: number) => ({
        type: q.type || 'likert_scale',
        question_text: q.question_text || '',
        description: q.description || '',
        required: q.required !== false,
        order: questions.length + idx,
        options: q.options || null,
        category: q.category || ''
      }));

      setQuestions(prev => [...prev, ...newQuestions]);
    }
    setShowTemplates(false);
  }

  function handleCSVImport(importedSurvey: any) {
    if (importedSurvey) {
      // Update form with imported data
      if (importedSurvey.title) setTitle(importedSurvey.title);
      if (importedSurvey.description) setDescription(importedSurvey.description);
      if (importedSurvey.survey_type) setSurveyType(importedSurvey.survey_type);
      if (importedSurvey.is_anonymous !== undefined) setIsAnonymous(importedSurvey.is_anonymous);

      if (importedSurvey.survey_questions) {
        setQuestions(importedSurvey.survey_questions);
      }

      if (importedSurvey.id) {
        setCreatedId(importedSurvey.id);
      }
    }
    setShowCSVUpload(false);
  }

  function copyId() {
    if (createdId) {
      navigator.clipboard.writeText(createdId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function save() {
    // If survey was already created via CSV, update instead
    if (mode === 'create' && createdId) {
      await updateExistingSurvey(createdId);
      return;
    }

    setSaving(true);
    try {
      const surveyData = {
        lesson_id: selectedLesson || null,
        course_id: selectedCourse || null,
        title,
        description,
        instructions,
        survey_type: surveyType,
        is_anonymous: isAnonymous,
        allow_multiple_responses: allowMultipleResponses,
        randomize_questions: randomizeQuestions,
        show_progress_bar: showProgressBar,
        thank_you_message: thankYouMessage,
        published,
        available_from: availableFrom,
        available_until: availableUntil
      };

      let currentSurveyId = surveyId;

      if (mode === 'create') {
        // Create new survey with questions
        const res = await fetch("/api/surveys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...surveyData, questions })
        });

        if (!res.ok) {
          const errorData = await res.json();
          alert(`Failed to create survey: ${errorData.error || 'Unknown error'}`);
          return;
        }

        const data = await res.json();
        currentSurveyId = data.survey?.id;
        setCreatedId(currentSurveyId || null);
      } else {
        // Update existing survey
        await updateExistingSurvey(surveyId!);
        return;
      }

      if (onSave) {
        onSave();
      } else if (mode === 'create') {
        alert('Survey saved successfully!');
      }
    } catch (error) {
      console.error('Error saving survey:', error);
      alert(`Failed to save survey: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateExistingSurvey(id: string) {
    setSaving(true);
    try {
      // Update survey settings
      const res = await fetch(`/api/surveys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: selectedLesson || null,
          course_id: selectedCourse || null,
          title,
          description,
          instructions,
          survey_type: surveyType,
          is_anonymous: isAnonymous,
          allow_multiple_responses: allowMultipleResponses,
          randomize_questions: randomizeQuestions,
          show_progress_bar: showProgressBar,
          thank_you_message: thankYouMessage,
          published,
          available_from: availableFrom,
          available_until: availableUntil
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to update survey: ${errorData.error || 'Unknown error'}`);
        return;
      }

      // Update questions
      await updateQuestions(id);

      if (onSave) {
        onSave();
      } else {
        alert('Survey updated successfully!');
      }
    } catch (error) {
      console.error('Error updating survey:', error);
      alert(`Failed to update survey: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateQuestions(surveyId: string) {
    // Get existing questions
    const existingRes = await fetch(`/api/surveys/${surveyId}/questions`);
    const existingData = await existingRes.json();
    const existingQuestions = existingData.questions || [];
    const existingQuestionIds = new Set(existingQuestions.map((q: any) => q.id));

    // Get current question IDs
    const currentQuestionIds = new Set(questions.filter(q => q.id).map(q => q.id));

    // Delete removed questions
    const questionsToDelete = existingQuestions.filter((q: any) => !currentQuestionIds.has(q.id));
    for (const q of questionsToDelete) {
      await fetch(`/api/surveys/${surveyId}/questions/${q.id}`, { method: "DELETE" });
    }

    // Update or create questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionData = {
        type: q.type,
        question_text: q.question_text,
        description: q.description || null,
        order: i,
        required: q.required,
        options: q.options || null,
        conditional_logic: q.conditional_logic || null,
        category: q.category || null
      };

      if (q.id && existingQuestionIds.has(q.id)) {
        // Update existing
        await fetch(`/api/surveys/${surveyId}/questions/${q.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(questionData)
        });
      } else {
        // Create new
        await fetch(`/api/surveys/${surveyId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: [questionData] })
        });
      }
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading survey...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-gray-900">
          {mode === 'edit' ? 'Edit Survey' : 'Create Survey'}
        </h1>
        {(urlLessonId || urlCourseId) && mode === 'create' && (
          <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
            {urlLessonId ? `Creating survey for lesson` : `Creating survey for course`}
          </div>
        )}
      </div>

      {/* Survey Settings */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Course Selection */}
        <div>
          <label className="mb-1 block text-xs text-gray-600">Course</label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedLesson("");
            }}
            disabled={loadingCourses || !!urlCourseId}
          >
            <option value="">{loadingCourses ? 'Loading...' : 'Select a course (optional)'}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>

        {/* Lesson Selection */}
        <div>
          <label className="mb-1 block text-xs text-gray-600">Lesson</label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            disabled={loadingLessons || !selectedCourse || !!urlLessonId}
          >
            <option value="">{loadingLessons ? 'Loading...' : 'Select a lesson (optional)'}</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
            ))}
          </select>
        </div>

        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Survey Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          className="rounded-md border px-3 py-2 text-sm"
          value={surveyType}
          onChange={(e) => setSurveyType(e.target.value)}
        >
          {SURVEY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>

        <input
          className="rounded-md border px-3 py-2 text-sm col-span-full"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <textarea
          className="col-span-full rounded-md border px-3 py-2 text-sm"
          placeholder="Instructions (shown before survey starts)"
          rows={2}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />

        <textarea
          className="col-span-full rounded-md border px-3 py-2 text-sm"
          placeholder="Thank you message (shown after submission)"
          rows={2}
          value={thankYouMessage}
          onChange={(e) => setThankYouMessage(e.target.value)}
        />
      </div>

      {/* Survey Options */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
          <span>Anonymous responses</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={allowMultipleResponses} onChange={(e) => setAllowMultipleResponses(e.target.checked)} />
          <span>Allow multiple responses</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={randomizeQuestions} onChange={(e) => setRandomizeQuestions(e.target.checked)} />
          <span>Randomize questions</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={showProgressBar} onChange={(e) => setShowProgressBar(e.target.checked)} />
          <span>Show progress bar</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          <span>Published</span>
        </label>
      </div>

      {/* Availability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs text-gray-600">Available from</label>
          <DateTimePicker value={availableFrom} onChange={setAvailableFrom} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Available until</label>
          <DateTimePicker value={availableUntil} onChange={setAvailableUntil} />
        </div>
      </div>

      {/* Import Options (Create mode only) */}
      {mode === 'create' && !createdId && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 bg-gray-50">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Start Options</h3>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button variant="secondary" onClick={() => setShowTemplates(true)}>
                <Icon icon="material-symbols:description" className="w-4 h-4 mr-2" />
                <span>Use Template</span>
              </Button>
              <Button variant="secondary" onClick={() => setShowAIGenerator(true)}>
                <Icon icon="material-symbols:auto-awesome" className="w-4 h-4 mr-2" />
                <span>AI Generate</span>
              </Button>
              <Button variant="secondary" onClick={() => setShowCSVUpload(true)}>
                <Icon icon="material-symbols:upload-file" className="w-4 h-4 mr-2" />
                <span>Import CSV</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Questions ({questions.length})
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowAIGenerator(true)}>
              <Icon icon="material-symbols:auto-awesome" className="w-4 h-4 mr-1" />
              <span>AI Generate</span>
            </Button>
            <Button onClick={addQuestion}>
              <Icon icon="material-symbols:add" className="w-4 h-4 mr-1" />
              <span>Add Question</span>
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Icon icon="material-symbols:quiz-outline" className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No questions yet. Add a question or use the quick start options above.</p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <SurveyQuestionEditor
              key={q.id || idx}
              value={q}
              index={idx}
              onChange={(newQ) => setQuestions(questions.map((qq, i) => (i === idx ? newQ : qq)))}
              onRemove={() => setQuestions(questions.filter((_, i) => i !== idx))}
              onMoveUp={idx > 0 ? () => {
                const newQuestions = [...questions];
                [newQuestions[idx - 1], newQuestions[idx]] = [newQuestions[idx], newQuestions[idx - 1]];
                setQuestions(newQuestions);
              } : undefined}
              onMoveDown={idx < questions.length - 1 ? () => {
                const newQuestions = [...questions];
                [newQuestions[idx], newQuestions[idx + 1]] = [newQuestions[idx + 1], newQuestions[idx]];
                setQuestions(newQuestions);
              } : undefined}
            />
          ))
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-2 pt-2">
        <Button onClick={save} disabled={saving || !title}>
          <span>{saving ? (mode === 'edit' ? "Updating..." : "Saving...") : (mode === 'edit' ? "Update Survey" : "Create Survey")}</span>
        </Button>
        {createdId && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <strong>Survey ID:</strong>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs ml-2">{createdId}</code>
              <button
                onClick={copyId}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <a className="text-sm text-blue-600 underline" href={`/surveys/${createdId}`}>
              View Survey
            </a>
            <a className="text-sm text-blue-600 underline" href={`/surveys/${createdId}/results`}>
              View Results
            </a>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAIGenerator && (
        <AISurveyGenerator
          lessonId={selectedLesson || undefined}
          courseId={selectedCourse || undefined}
          surveyType={surveyType}
          onQuestionsGenerated={handleAIGeneratedQuestions}
          onClose={() => setShowAIGenerator(false)}
        />
      )}

      {showCSVUpload && (
        <SurveyCSVUpload
          courseId={selectedCourse || undefined}
          lessonId={selectedLesson || undefined}
          onImport={handleCSVImport}
          onClose={() => setShowCSVUpload(false)}
        />
      )}

      {showTemplates && (
        <SurveyTemplates
          surveyType={surveyType}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
