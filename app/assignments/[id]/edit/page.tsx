"use client";

import React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import DateTimePicker from "@/app/components/ui/DateTimePicker";
import RubricBuilder, { type RubricCriterion } from "@/app/components/assignment/RubricBuilder";
import Button from "@/app/components/ui/Button";
import TextEditor from "@/app/components/editor/TextEditor";
import { Icon } from '@iconify/react';
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import RoleGuard from "@/app/components/RoleGuard";

interface Lesson {
  id: string;
  title: string;
  course_id: string;
  courses: {
    title: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  lesson_id: string;
  course_id: string | null;
  due_date: string | null;
  points: number;
  published: boolean;
  submission_types: string[];
  file_types_allowed: string[];
  max_file_size: number;
  rubric: RubricCriterion[];
  allow_late_submissions: boolean;
  anonymous_grading: boolean;
  peer_review_enabled: boolean;
  peer_reviews_required: number;
  peer_review_due_date: string | null;
  peer_review_anonymous: boolean;
  peer_review_rubric: any;
  is_group_assignment: boolean;
  group_set_id: string | null;
  one_submission_per_group: boolean;
}

interface CourseGroup {
  id: string;
  name: string;
  course_id: string;
}

export default function EditAssignmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = params.id;

  // Same-origin guard: only accept absolute paths starting with "/" and
  // reject protocol-relative "//evil" or full URLs to prevent open-redirect.
  const rawReturnTo = searchParams.get('returnTo');
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//')
      ? rawReturnTo
      : null;

  const [assignment, setAssignment] = React.useState<Assignment | null>(null);
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
  const [anonymousGrading, setAnonymousGrading] = React.useState(false);
  const [peerReviewEnabled, setPeerReviewEnabled] = React.useState(false);
  const [peerReviewsRequired, setPeerReviewsRequired] = React.useState(2);
  const [peerReviewDueDate, setPeerReviewDueDate] = React.useState<string | null>(null);
  const [peerReviewAnonymous, setPeerReviewAnonymous] = React.useState(true);
  const [isGroupAssignment, setIsGroupAssignment] = React.useState(false);
  const [groupSetId, setGroupSetId] = React.useState<string | null>(null);
  const [oneSubmissionPerGroup, setOneSubmissionPerGroup] = React.useState(true);
  const [courseGroups, setCourseGroups] = React.useState<CourseGroup[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [courses, setCourses] = React.useState<Array<{ id: string; title: string }>>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<string>("");

  // Load assignment data, courses, and lessons
  React.useEffect(() => {
    async function loadData() {
      try {
        // Load assignment data, courses, and lessons in parallel
        const [assignmentRes, coursesRes, lessonsRes] = await Promise.all([
          fetch(`/api/assignments/${assignmentId}`),
          fetch("/api/courses"),
          fetch("/api/lessons")
        ]);

        // Process courses
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData.courses || []);
        }

        // Process lessons
        if (lessonsRes.ok) {
          const lessonsData = await lessonsRes.json();
          const validLessons = (lessonsData.lessons || []).filter((lesson: any) =>
            lesson && lesson.id && lesson.title && lesson.courses && lesson.courses.title
          );
          setLessons(validLessons);
        }

        // Process assignment data
        if (assignmentRes.ok) {
          const assignmentData = await assignmentRes.json();
          setAssignment(assignmentData);
          setTitle(assignmentData.title || "");
          setDescription(assignmentData.description || "");
          setLessonId(assignmentData.lesson_id || "");
          setSelectedCourse(assignmentData.course_id || "");
          setDueDate(assignmentData.due_date || null);
          setPoints(assignmentData.points || 100);
          setPublished(assignmentData.published || false);
          setTypes(assignmentData.submission_types || ["file", "text"]);
          setFileTypes(assignmentData.file_types_allowed?.join(",") || "pdf,doc,docx,ppt,pptx");
          setMaxFileSize(assignmentData.max_file_size || 50);
          setRubric(assignmentData.rubric || []);
          setAllowLate(assignmentData.allow_late_submissions !== false);
          setAnonymousGrading(assignmentData.anonymous_grading || false);
          setPeerReviewEnabled(assignmentData.peer_review_enabled || false);
          setPeerReviewsRequired(assignmentData.peer_reviews_required || 2);
          setPeerReviewDueDate(assignmentData.peer_review_due_date || null);
          setPeerReviewAnonymous(assignmentData.peer_review_anonymous !== false);
          setIsGroupAssignment(assignmentData.is_group_assignment || false);
          setGroupSetId(assignmentData.group_set_id || null);
          setOneSubmissionPerGroup(assignmentData.one_submission_per_group !== false);

          // If no course_id on assignment but there's a lesson, derive it
          if (!assignmentData.course_id && assignmentData.lesson_id) {
            const lessonRes = await fetch(`/api/lessons/${assignmentData.lesson_id}`);
            if (lessonRes.ok) {
              const lessonData = await lessonRes.json();
              if (lessonData.course_id) {
                setSelectedCourse(lessonData.course_id);
                // Load course groups
                const groupsRes = await fetch(`/api/courses/${lessonData.course_id}/groups`);
                if (groupsRes.ok) {
                  const groupsData = await groupsRes.json();
                  setCourseGroups(groupsData.groups || []);
                }
              }
            }
          } else if (assignmentData.course_id) {
            // Load course groups directly
            const groupsRes = await fetch(`/api/courses/${assignmentData.course_id}/groups`);
            if (groupsRes.ok) {
              const groupsData = await groupsRes.json();
              setCourseGroups(groupsData.groups || []);
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [assignmentId]);

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function save() {
    if (!selectedCourse) {
      alert("Please select a course for this assignment");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId || null,
          course_id: selectedCourse,
          title,
          description,
          due_date: dueDate,
          points,
          submission_types: types,
          file_types_allowed: fileTypes.split(",").map((s) => s.trim()),
          max_file_size: maxFileSize,
          rubric,
          allow_late_submissions: allowLate,
          anonymous_grading: anonymousGrading,
          peer_review_enabled: peerReviewEnabled,
          peer_reviews_required: peerReviewsRequired,
          peer_review_due_date: peerReviewDueDate,
          peer_review_anonymous: peerReviewAnonymous,
          is_group_assignment: isGroupAssignment,
          group_set_id: isGroupAssignment ? groupSetId : null,
          one_submission_per_group: oneSubmissionPerGroup,
          published
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to update assignment: ${errorData.error}`);
        return;
      }
      
      alert("Assignment updated successfully!");
      // Prefer an explicit returnTo (e.g. course Assessments tab).
      // Otherwise fall back to the assignment's source course, then the
      // generic /assignments list.
      if (returnTo) {
        router.push(returnTo);
      } else if (assignment?.course_id) {
        router.push(`/course/${assignment.course_id}?tab=assessments`);
      } else if (selectedCourse) {
        router.push(`/course/${selectedCourse}?tab=assessments`);
      } else {
        router.push("/assignments");
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert("Failed to update assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Icon icon="mdi:loading" className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Icon icon="mdi:alert-circle" className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Assignment Not Found</h2>
          <p className="text-gray-600 mb-4">The assignment you're looking for doesn't exist or you don't have permission to edit it.</p>
          <Button onClick={() => router.push("/assignments")}>
            Back to Assignments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]} fallback={<div className="mx-auto max-w-2xl px-4 py-8"><p className="text-sm text-gray-700">Access denied. You do not have permission to edit assignments.</p></div>}>
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Assignment</h1>
            <p className="text-gray-600">Update assignment details and settings</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/assignments")}>
            <Icon icon="mdi:arrow-left" className="w-4 h-4 mr-2" />
            Back to Assignments
          </Button>
        </div>
      </div>

      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Assignments', href: '/assignments' },
          { label: assignment?.title || 'Assignment', href: `/assignment/${assignmentId}` },
          { label: 'Edit' },
        ]}
        className="mb-6"
      />
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter assignment title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <TextEditor
                value={description}
                onChange={setDescription}
                placeholder="Enter assignment description with formatting..."
                height={250}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    // Clear lesson when course changes
                    setLessonId("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lesson Selection - filtered by selected course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lesson (Optional)</label>
                <select
                  value={lessonId}
                  onChange={(e) => {
                    setLessonId(e.target.value);
                    if (!selectedCourse) {
                      const lesson = lessons.find(l => l.id === e.target.value);
                      if (lesson?.course_id) {
                        setSelectedCourse(lesson.course_id);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!selectedCourse}
                >
                  <option value="">
                    {!selectedCourse ? 'Select a course first' : 'Select a lesson (optional)'}
                  </option>
                  {lessons
                    .filter((lesson) => !selectedCourse || lesson.course_id === selectedCourse)
                    .map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                </select>
                {selectedCourse && lessons.filter(l => l.course_id === selectedCourse).length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">No lessons in this course.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <DateTimePicker
                value={dueDate}
                onChange={setDueDate}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Published (visible to students)</span>
            </label>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={allowLate}
                onChange={(e) => setAllowLate(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Allow late submissions</span>
            </label>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={anonymousGrading}
                onChange={(e) => setAnonymousGrading(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Anonymous grading (hide student names during grading)</span>
            </label>
            {anonymousGrading && (
              <p className="mt-1 text-xs text-amber-600 ml-6">
                <Icon icon="material-symbols:info" className="w-4 h-4 inline mr-1" />
                Student names will be hidden until all submissions are graded
              </p>
            )}
          </div>
        </div>

        {/* Peer Review Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <Icon icon="mdi:account-group" className="w-5 h-5 inline mr-2" />
            Peer Review
          </h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={peerReviewEnabled}
                  onChange={(e) => setPeerReviewEnabled(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Enable peer review for this assignment</span>
              </label>
              <p className="mt-1 text-xs text-gray-500 ml-6">
                Students will review and provide feedback on each other's submissions
              </p>
            </div>

            {peerReviewEnabled && (
              <div className="ml-6 pl-4 border-l-2 border-blue-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reviews Required Per Submission
                    </label>
                    <input
                      type="number"
                      value={peerReviewsRequired}
                      onChange={(e) => setPeerReviewsRequired(Math.max(1, Math.min(5, Number(e.target.value))))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Number of peer reviews each submission will receive (1-5)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peer Review Due Date
                    </label>
                    <DateTimePicker
                      value={peerReviewDueDate}
                      onChange={setPeerReviewDueDate}
                    />
                    <p className="text-xs text-gray-500 mt-1">When peer reviews must be completed by</p>
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={peerReviewAnonymous}
                      onChange={(e) => setPeerReviewAnonymous(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Anonymous peer reviews</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Hide reviewer and author identities during peer review process
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <Icon icon="mdi:information" className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">How Peer Review Works:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Students submit their assignments before the due date</li>
                        <li>After the due date, you assign peer reviewers (manually or auto-assign)</li>
                        <li>Students review assigned submissions and provide feedback</li>
                        <li>You can view all reviews and include them in final grading</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Group Assignment Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <Icon icon="mdi:account-multiple" className="w-5 h-5 inline mr-2" />
            Group Assignment
          </h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isGroupAssignment}
                  onChange={(e) => setIsGroupAssignment(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">This is a group assignment</span>
              </label>
              <p className="mt-1 text-xs text-gray-500 ml-6">
                Students will work together in groups and submit as a team
              </p>
            </div>

            {isGroupAssignment && (
              <div className="ml-6 pl-4 border-l-2 border-teal-200 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Group Set
                  </label>
                  {courseGroups.length > 0 ? (
                    <select
                      value={groupSetId || ""}
                      onChange={(e) => setGroupSetId(e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="">Select a group...</option>
                      {courseGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        <Icon icon="mdi:information" className="w-4 h-4 inline mr-1" />
                        No groups found for this course. Create groups first in the course management page.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={oneSubmissionPerGroup}
                      onChange={(e) => setOneSubmissionPerGroup(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">One submission per group</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    {oneSubmissionPerGroup
                      ? "Only one group member needs to submit for the entire group"
                      : "Each group member must submit individually"}
                  </p>
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <Icon icon="mdi:information" className="w-5 h-5 text-teal-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-teal-800">
                      <p className="font-medium mb-1">How Group Assignments Work:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Students are assigned to groups in the course</li>
                        <li>Any group member can submit on behalf of the group</li>
                        <li>Grades are applied to all group members</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submission Types */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Types</h2>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {["file", "text", "url"].map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={types.includes(type)}
                    onChange={() => toggleType(type)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 capitalize">{type}</span>
                </label>
              ))}
            </div>

            {types.includes("file") && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Allowed File Types</label>
                <input
                  type="text"
                  value={fileTypes}
                  onChange={(e) => setFileTypes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="pdf,doc,docx,ppt,pptx"
                />
                <p className="text-xs text-gray-500">Comma-separated list of file extensions</p>
              </div>
            )}

            {types.includes("file") && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Max File Size (MB)</label>
                <input
                  type="number"
                  value={maxFileSize}
                  onChange={(e) => setMaxFileSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
            )}
          </div>
        </div>

        {/* Rubric */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grading Rubric</h2>
          <RubricBuilder value={rubric} onChange={setRubric} assignmentTitle={title} assignmentDescription={description} maxPoints={points} rubricType="assignment" />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button variant="outline" onClick={() => router.push("/assignments")}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
