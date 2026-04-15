"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import Button from "@/app/components/ui/Button";
import ProgressVisualization from "@/app/components/ProgressVisualization";
import { stripHtml } from "@/lib/utils";
import { sanitizeHtml } from '@/lib/sanitize';

interface CoursePreviewProps {
  courseId: string;
  onEnroll?: () => void;
  onClose?: () => void;
}

export default function CoursePreview({
  courseId,
  onEnroll,
  onClose,
}: CoursePreviewProps) {
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchCoursePreview();
  }, [courseId]);

  const fetchCoursePreview = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/preview`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
        setLessons(data.lessons || []);
        setInstructors(data.instructors || []);
      }
    } catch (error) {
      console.error("Error fetching course preview:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId }),
      });

      if (response.ok) {
        onEnroll?.();
        if (onClose) {
          onClose();
        } else {
          window.location.href = `/course/${courseId}`;
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to enroll in course");
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      alert("Failed to enroll in course");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course preview...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center p-12">
        <Icon
          icon="material-symbols:error-outline"
          className="w-16 h-16 text-gray-400 mx-auto mb-4"
        />
        <p className="text-gray-600">Course not found or not available for preview</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="relative">
        {course.thumbnail && (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-64 object-cover"
          />
        )}
        <div className="absolute top-4 right-4">
          {onClose && (
            <button
              onClick={onClose}
              className="bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors"
            >
              <Icon icon="material-symbols:close" className="w-6 h-6 text-gray-600" />
            </button>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
          <h1 className="text-xl font-medium text-white mb-2">{course.title}</h1>
          {course.description && (
            <p className="text-white/90 text-lg">{stripHtml(course.description)}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Course Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {course.difficulty && (
            <div className="flex items-center gap-2">
              <Icon icon="material-symbols:trending-up" className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Difficulty</p>
                <p className="font-semibold text-gray-900 capitalize">{course.difficulty}</p>
              </div>
            </div>
          )}
          {course.estimated_duration && (
            <div className="flex items-center gap-2">
              <Icon icon="material-symbols:schedule" className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="font-semibold text-gray-900">{course.estimated_duration}</p>
              </div>
            </div>
          )}
          {course.grade_level && (
            <div className="flex items-center gap-2">
              <Icon icon="material-symbols:school" className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Grade Level</p>
                <p className="font-semibold text-gray-900">{course.grade_level}</p>
              </div>
            </div>
          )}
          {course.enrollment_count !== undefined && (
            <div className="flex items-center gap-2">
              <Icon icon="material-symbols:people" className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Students</p>
                <p className="font-semibold text-gray-900">{course.enrollment_count}</p>
              </div>
            </div>
          )}
        </div>

        {/* Syllabus */}
        {course.syllabus && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Course Overview</h2>
            <div
              className="prose prose-sm max-w-none rich-text-content"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(course.syllabus) }}
            />
          </div>
        )}

        {/* Lessons Preview */}
        {lessons.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Course Content ({lessons.length} lessons)
            </h2>
            <div className="space-y-2">
              {lessons.slice(0, 5).map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{lesson.title}</p>
                    {lesson.estimated_duration && (
                      <p className="text-sm text-gray-600">{lesson.estimated_duration}</p>
                    )}
                  </div>
                </div>
              ))}
              {lessons.length > 5 && (
                <p className="text-sm text-gray-600 text-center py-2">
                  +{lessons.length - 5} more lessons
                </p>
              )}
            </div>
          </div>
        )}

        {/* Instructors */}
        {instructors.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Instructors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {instructors.map((instructor) => (
                <div
                  key={instructor.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {instructor.avatar ? (
                    <img
                      src={instructor.avatar}
                      alt={instructor.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Icon icon="material-symbols:person" className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{instructor.name}</p>
                    {instructor.bio && (
                      <p className="text-sm text-gray-600 line-clamp-1">{instructor.bio}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          <Button
            onClick={handleEnroll}
            disabled={enrolling}
            className="flex-1"
          >
            {enrolling ? "Enrolling..." : "Enroll in Course"}
          </Button>
          <Link
            href={`/course/${courseId}`}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Full Course
          </Link>
        </div>
      </div>
    </div>
  );
}

