"use client";

import React from "react";
import DateTimePicker from "@/app/components/ui/DateTimePicker";
import RubricBuilder, { type RubricCriterion } from "@/app/components/assignment/RubricBuilder";
import Button from "@/app/components/ui/Button";
import TextEditor from "@/app/components/editor/TextEditor";

interface Lesson {
  id: string;
  title: string;
  course_id: string;
  courses: {
    title: string;
  };
}

interface GeneratedAssignment {
  title: string;
  description: string;
  instructions: string;
  points: number;
  rubric: RubricCriterion[];
  suggestedDueDays: number;
  learningObjectives: string[];
  submissionGuidelines: string;
}

export default function AssignmentBuilder() {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [lessonId, setLessonId] = React.useState<string>("");
  const [dueDate, setDueDate] = React.useState<string | null>(null);
  const [points, setPoints] = React.useState(100);
  const [published, setPublished] = React.useState(false);
  const [types, setTypes] = React.useState<string[]>(["file", "text"]);
  const [fileTypes, setFileTypes] = React.useState<string>("pdf,doc,docx,ppt,pptx");
  const [maxFileSize, setMaxFileSize] = React.useState(50);
  const [rubric, setRubric] = React.useState<RubricCriterion[]>([]);
  const [allowLate, setAllowLate] = React.useState(true);
  const [showInCurriculum, setShowInCurriculum] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Course selection for standalone assignments
  const [courses, setCourses] = React.useState<Array<{ id: string; title: string }>>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<string>("");
  const [loadingCourses, setLoadingCourses] = React.useState(false);

  // AI Generation state
  const [showAiPanel, setShowAiPanel] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [aiTopic, setAiTopic] = React.useState("");
  const [aiAssignmentType, setAiAssignmentType] = React.useState<string>("essay");
  const [aiDifficulty, setAiDifficulty] = React.useState<string>("intermediate");
  const [aiSource, setAiSource] = React.useState<'topic' | 'lesson'>('topic');

  // Load courses and lessons on component mount
  React.useEffect(() => {
    async function loadData() {
      try {
        // Load courses
        setLoadingCourses(true);
        const coursesRes = await fetch("/api/courses");
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData.courses || []);
        }

        // Load lessons
        const lessonsRes = await fetch("/api/lessons");
        if (lessonsRes.ok) {
          const data = await lessonsRes.json();
          // Filter out lessons without course data and ensure we have valid lessons
          const validLessons = (data.lessons || []).filter((lesson: any) =>
            lesson && lesson.id && lesson.title && lesson.courses
          );
          setLessons(validLessons);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
        setLoadingCourses(false);
      }
    }
    loadData();
  }, []);

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function generateWithAI() {
    if (aiSource === 'topic' && !aiTopic.trim()) {
      alert("Please enter a topic for the assignment");
      return;
    }
    if (aiSource === 'lesson' && !lessonId) {
      alert("Please select a lesson first");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/ai/assignment-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: aiSource,
          topic: aiSource === 'topic' ? aiTopic : undefined,
          lessonId: aiSource === 'lesson' ? lessonId : undefined,
          assignmentType: aiAssignmentType,
          difficulty: aiDifficulty,
          pointsTarget: points,
          rubricCriteriaCount: 4
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate assignment");
      }

      const data = await res.json();
      const generated: GeneratedAssignment = data.assignment;

      // Apply generated content to form
      setTitle(generated.title);
      setDescription(generated.description + (generated.instructions ? `\n\n${generated.instructions}` : ''));
      setPoints(generated.points);
      setRubric(generated.rubric || []);

      // Set due date based on suggestion
      if (generated.suggestedDueDays) {
        const dueDateTime = new Date();
        dueDateTime.setDate(dueDateTime.getDate() + generated.suggestedDueDays);
        dueDateTime.setHours(23, 59, 0, 0);
        setDueDate(dueDateTime.toISOString());
      }

      setShowAiPanel(false);
      alert("Assignment generated successfully! Review and adjust as needed.");
    } catch (error: any) {
      console.error('AI generation error:', error);
      alert(error.message || "Failed to generate assignment. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!selectedCourse) {
      alert("Please select a course for this assignment");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId || null,
          course_id: selectedCourse || null,
          title,
          description,
          due_date: dueDate,
          points,
          submission_types: types,
          file_types_allowed: fileTypes.split(",").map((s) => s.trim()),
          max_file_size: maxFileSize,
          rubric,
          allow_late_submissions: allowLate,
          published,
          show_in_curriculum: showInCurriculum
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to create assignment: ${errorData.error}`);
        return;
      }
      
      const data = await res.json();
      setCreatedId(data.id as string);
      alert("Assignment created successfully!");
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert("Failed to create assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <div className="text-center">Loading lessons...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-gray-900">Create Assignment</h1>
        <button
          onClick={() => setShowAiPanel(!showAiPanel)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Generate with AI
        </button>
      </div>

      {/* AI Generation Panel */}
      {showAiPanel && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-medium text-purple-900">AI Assignment Generator</h3>
          </div>
          <p className="text-sm text-purple-700 mb-4">
            Generate a complete assignment with rubric based on a topic or lesson content.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Selection */}
            <div>
              <label className="block text-sm font-medium text-purple-900 mb-2">Generate from</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="aiSource"
                    checked={aiSource === 'topic'}
                    onChange={() => setAiSource('topic')}
                    className="mr-2 text-purple-600"
                  />
                  <span className="text-sm text-gray-700">Topic</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="aiSource"
                    checked={aiSource === 'lesson'}
                    onChange={() => setAiSource('lesson')}
                    className="mr-2 text-purple-600"
                  />
                  <span className="text-sm text-gray-700">Lesson Content</span>
                </label>
              </div>
            </div>

            {/* Topic Input */}
            {aiSource === 'topic' && (
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">Topic</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g., Climate Change and Its Effects"
                  className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-purple-500"
                />
              </div>
            )}

            {/* Lesson Selection for AI */}
            {aiSource === 'lesson' && (
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">Select Lesson</label>
                <select
                  value={lessonId}
                  onChange={(e) => {
                    setLessonId(e.target.value);
                    const lesson = lessons.find(l => l.id === e.target.value);
                    if (lesson?.course_id) {
                      setSelectedCourse(lesson.course_id);
                    }
                  }}
                  className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-purple-500"
                >
                  <option value="">Select a lesson</option>
                  {(selectedCourse ? lessons.filter(l => l.course_id === selectedCourse) : lessons).map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.courses?.title || 'Unknown Course'} - {lesson.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Assignment Type */}
            <div>
              <label className="block text-sm font-medium text-purple-900 mb-2">Assignment Type</label>
              <select
                value={aiAssignmentType}
                onChange={(e) => setAiAssignmentType(e.target.value)}
                className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-purple-500"
              >
                <option value="essay">Essay</option>
                <option value="project">Project</option>
                <option value="research">Research Paper</option>
                <option value="practical">Practical Exercise</option>
                <option value="presentation">Presentation</option>
                <option value="case_study">Case Study</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-purple-900 mb-2">Difficulty Level</label>
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
                className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-purple-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={generateWithAI}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Assignment
                </>
              )}
            </button>
            <button
              onClick={() => setShowAiPanel(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
        <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Assignment title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      {/* Description with Rich Text Editor */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
        <TextEditor
          value={description}
          onChange={setDescription}
          placeholder="Enter assignment description with formatting..."
          height={250}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Course Selection */}
        <div>
          <label className="mb-1 block text-xs text-gray-600">
            <span>Course *</span>
          </label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              // Clear lesson selection when course changes
              setLessonId("");
            }}
            disabled={loadingCourses}
          >
            <option value="">{loadingCourses ? 'Loading courses...' : 'Select a course'}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        {/* Lesson Selection - filtered by selected course */}
        <div>
          <label className="mb-1 block text-xs text-gray-600">
            <span>Lesson (Optional)</span>
          </label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={lessonId}
            onChange={(e) => {
              setLessonId(e.target.value);
              // Auto-select course from lesson if not already selected
              if (!selectedCourse) {
                const lesson = lessons.find(l => l.id === e.target.value);
                if (lesson?.course_id) {
                  setSelectedCourse(lesson.course_id);
                }
              }
            }}
            disabled={loading || !selectedCourse}
          >
            <option value="">
              {!selectedCourse ? 'Select a course first' : loading ? 'Loading lessons...' : 'Select a lesson (optional)'}
            </option>
            {lessons
              .filter((lesson) => !selectedCourse || lesson.course_id === selectedCourse)
              .map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
          </select>
          {selectedCourse && !loading && lessons.filter(l => l.course_id === selectedCourse).length === 0 && (
            <p className="mt-1 text-xs text-gray-500">No lessons in this course. Assignment will be standalone.</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600"><span>Due date</span></label>
          <DateTimePicker value={dueDate} onChange={setDueDate} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600"><span>Points</span></label>
          <input type="number" className="w-24 rounded-md border px-2 py-1 text-sm" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-600"><span>Submission types</span></div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-700">
            {(["file", "text", "url", "media"]).map((t) => (
              <label key={t} className="flex items-center gap-1"><input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} /><span>{t}</span></label>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-600"><span>File types allowed</span></div>
          <input className="w-full rounded-md border px-3 py-2 text-sm" value={fileTypes} onChange={(e) => setFileTypes(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600"><span>Max file size (MB)</span></label>
          <input type="number" className="w-24 rounded-md border px-2 py-1 text-sm" value={maxFileSize} onChange={(e) => setMaxFileSize(Number(e.target.value))} />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /><span>Published</span></label>
        <label className="flex items-center gap-2 text-xs text-gray-700" title="When enabled, this assignment will appear as a standalone item in the course curriculum alongside lessons">
          <input type="checkbox" checked={showInCurriculum} onChange={(e) => setShowInCurriculum(e.target.checked)} />
          <span>Show in Course Curriculum</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} /><span>Allow late submissions</span></label>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Rubric</h2>
        <RubricBuilder value={rubric} onChange={setRubric} assignmentTitle={title} assignmentDescription={description} maxPoints={points} rubricType="assignment" />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={save} disabled={saving}><span>{saving ? "Saving…" : "Create Assignment"}</span></Button>
        {createdId && (
          <a className="text-sm text-[#3B82F6] underline" href={`/assignment/${createdId}`}>
            <span>Open assignment page</span>
          </a>
        )}
      </div>
    </div>
  );
}
