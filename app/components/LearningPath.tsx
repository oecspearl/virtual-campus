"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

interface LessonStep {
  id: string;
  title: string;
  completed: boolean;
  current: boolean;
  link: string;
}

interface LearningPathProps {
  lessons: LessonStep[];
  courseTitle?: string;
  courseId?: string;
}

export default function LearningPath({
  lessons,
  courseTitle,
  courseId,
}: LearningPathProps) {
  if (!lessons || lessons.length === 0) {
    return null;
  }

  const completedCount = lessons.filter((l) => l.completed).length;
  const totalCount = lessons.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {courseTitle && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{courseTitle}</h3>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              {percentage}%
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {lessons.map((lesson, index) => {
          const isCompleted = lesson.completed;
          const isCurrent = lesson.current;
          const isPast = index < lessons.findIndex((l) => l.current);

          return (
            <Link
              key={lesson.id}
              href={lesson.link}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                isCurrent
                  ? "bg-blue-50 border-2 border-blue-500 shadow-md"
                  : isCompleted
                  ? "bg-green-50 border border-green-200 hover:bg-green-100"
                  : isPast
                  ? "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100 opacity-75"
              }`}
            >
              {/* Step Number */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {isCompleted ? (
                  <Icon icon="material-symbols:check" className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Lesson Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`font-medium truncate ${
                      isCurrent
                        ? "text-blue-900"
                        : isCompleted
                        ? "text-green-900"
                        : "text-gray-700"
                    }`}
                  >
                    {lesson.title}
                  </h4>
                  {isCurrent && (
                    <span className="flex-shrink-0 px-2 py-1 text-xs font-semibold bg-blue-500 text-white rounded-full">
                      Current
                    </span>
                  )}
                </div>
              </div>

            </Link>
          );
        })}
      </div>
    </div>
  );
}

