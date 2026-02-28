'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  Users,
  ChevronRight,
  CheckCircle,
  Lock,
  Play,
  Award,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  thumbnail?: string;
  lesson_count?: number;
}

interface PathCourse {
  id: string;
  order: number;
  is_required: boolean;
  unlock_after_previous: boolean;
  course: Course;
  progress?: {
    progress?: number;
    completed_at?: string;
  } | null;
  is_unlocked?: boolean;
}

interface Progress {
  total_courses: number;
  completed_courses: number;
  percentage: number;
}

interface Enrollment {
  enrolled_at: string;
  completed_at?: string;
  status: string;
  progress?: Progress;
}

interface LearningPath {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  difficulty?: string;
  estimated_duration?: string;
  published?: boolean;
  courses?: PathCourse[];
  enrollment?: Enrollment | null;
}

interface LearningPathCardProps {
  path: LearningPath;
  variant?: 'compact' | 'detailed' | 'mini';
  showEnrollButton?: boolean;
  onEnroll?: (pathId: string) => Promise<void>;
}

export default function LearningPathCard({
  path,
  variant = 'compact',
  showEnrollButton = true,
  onEnroll,
}: LearningPathCardProps) {
  const [enrolling, setEnrolling] = useState(false);

  const courseCount = path.courses?.length || 0;
  const isEnrolled = !!path.enrollment;
  const isCompleted = path.enrollment?.completed_at != null;
  const progress = path.enrollment?.progress?.percentage || 0;

  const handleEnroll = async () => {
    if (!onEnroll) return;
    setEnrolling(true);
    try {
      await onEnroll(path.id);
    } finally {
      setEnrolling(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (variant === 'mini') {
    return (
      <Link
        href={`/learning-paths/${path.id}`}
        className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">
              {path.title}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {courseCount} courses
            </p>
          </div>
          {isEnrolled && (
            <div className="flex-shrink-0">
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {progress}%
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header with thumbnail */}
        <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
          {path.thumbnail && (
            <Image
              src={path.thumbnail}
              alt={path.title}
              fill
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-xl font-bold text-white mb-1">{path.title}</h3>
            {path.difficulty && (
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(path.difficulty)}`}>
                {path.difficulty}
              </span>
            )}
          </div>
          {isCompleted && (
            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <Award className="w-4 h-4" />
              Completed
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {path.description && (
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {path.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{courseCount} courses</span>
            </div>
            {path.estimated_duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{path.estimated_duration}</span>
              </div>
            )}
          </div>

          {/* Progress */}
          {isEnrolled && !isCompleted && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-300">Progress</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {progress}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Courses preview */}
          {path.courses && path.courses.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Courses in this path
              </h4>
              <div className="space-y-2">
                {path.courses.slice(0, 3).map((pc) => (
                  <div
                    key={pc.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    {pc.is_unlocked === false ? (
                      <Lock className="w-4 h-4 text-gray-400" />
                    ) : pc.progress?.completed_at ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                    )}
                    <span className={`truncate ${
                      pc.is_unlocked === false
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {pc.course.title}
                    </span>
                  </div>
                ))}
                {path.courses.length > 3 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    +{path.courses.length - 3} more courses
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action button */}
          {showEnrollButton && (
            <div className="flex gap-2">
              <Link
                href={`/learning-paths/${path.id}`}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center text-sm font-medium"
              >
                View Details
              </Link>
              {!isEnrolled && onEnroll && (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  {enrolling ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start Path
                    </>
                  )}
                </button>
              )}
              {isEnrolled && !isCompleted && (
                <Link
                  href={`/learning-paths/${path.id}`}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                >
                  Continue
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default compact variant
  return (
    <Link
      href={`/learning-paths/${path.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="flex">
        {/* Thumbnail */}
        <div className="relative w-32 h-32 flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600">
          {path.thumbnail ? (
            <Image
              src={path.thumbnail}
              alt={path.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-white/80" />
            </div>
          )}
          {isCompleted && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-2">
              {path.title}
            </h3>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>

          {path.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {path.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {courseCount} courses
            </span>
            {path.difficulty && (
              <span className={`px-1.5 py-0.5 rounded ${getDifficultyColor(path.difficulty)}`}>
                {path.difficulty}
              </span>
            )}
          </div>

          {/* Progress bar for enrolled users */}
          {isEnrolled && !isCompleted && (
            <div className="mt-2">
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
