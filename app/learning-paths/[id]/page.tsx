'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Award,
  CheckCircle,
  Lock,
  Play,
  ChevronRight,
  Users,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  lesson_count?: number;
  instructor?: {
    id: string;
    full_name: string;
  };
}

interface PathCourse {
  id: string;
  order: number;
  is_required: boolean;
  unlock_after_previous: boolean;
  course: Course;
  progress?: {
    enrolled_at?: string;
    progress?: number;
    completed_at?: string;
    is_completed?: boolean;
  } | null;
  is_unlocked?: boolean;
}

interface LearningPath {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  difficulty?: string;
  estimated_duration?: string;
  published?: boolean;
  creator?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  courses?: PathCourse[];
  enrollment?: {
    enrolled_at: string;
    completed_at?: string;
    status: string;
    progress?: {
      total_courses: number;
      completed_courses: number;
      percentage: number;
    };
  } | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LearningPathPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchPath();
  }, [id]);

  const fetchPath = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/learning-paths/${id}?include_progress=true`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch learning path');
      }

      setPath(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      const response = await fetch(`/api/learning-paths/${id}/enroll`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to enroll');
      }

      await fetchPath();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!confirm('Are you sure you want to unenroll from this learning path?')) {
      return;
    }

    try {
      const response = await fetch(`/api/learning-paths/${id}/enroll`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unenroll');
      }

      router.push('/learning-paths');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unenroll');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !path) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {error || 'Learning path not found'}
            </h2>
            <Link
              href="/learning-paths"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Back to Learning Paths
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isEnrolled = !!path.enrollment;
  const isCompleted = path.enrollment?.completed_at != null;
  const progress = path.enrollment?.progress;
  const courseCount = path.courses?.length || 0;

  // Find the next course to continue
  const nextCourse = path.courses?.find(
    (c) => c.is_unlocked !== false && !c.progress?.is_completed
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        {path.thumbnail && (
          <div className="absolute inset-0">
            <Image
              src={path.thumbnail}
              alt={path.title}
              fill
              className="object-cover opacity-20"
            />
          </div>
        )}
        <div className="relative max-w-5xl mx-auto px-4 py-12">
          <Link
            href="/learning-paths"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Learning Paths
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                {path.difficulty && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(path.difficulty)}`}>
                    {path.difficulty}
                  </span>
                )}
                {isCompleted && (
                  <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Completed
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-3">{path.title}</h1>

              {path.description && (
                <p className="text-white/80 text-lg mb-4">{path.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
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
                {path.creator && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>By {path.creator.full_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress or enroll */}
            <div className="md:w-64">
              {isEnrolled ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  {!isCompleted && progress && (
                    <>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span className="font-medium">{progress.percentage}%</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <p className="text-sm text-white/70">
                        {progress.completed_courses} of {progress.total_courses} courses completed
                      </p>
                    </>
                  )}

                  {isCompleted ? (
                    <div className="text-center py-4">
                      <Award className="w-12 h-12 mx-auto mb-2" />
                      <p className="font-medium">Path Completed!</p>
                    </div>
                  ) : nextCourse ? (
                    <Link
                      href={`/course/${nextCourse.course.id}`}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Continue Learning
                    </Link>
                  ) : null}
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {enrolling ? (
                    <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start Learning Path
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course list */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Courses in this Path
        </h2>

        <div className="space-y-4">
          {path.courses?.map((pathCourse, index) => (
            <CourseCard
              key={pathCourse.id}
              pathCourse={pathCourse}
              index={index}
              isEnrolled={isEnrolled}
            />
          ))}
        </div>

        {/* Unenroll button */}
        {isEnrolled && !isCompleted && (
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleUnenroll}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
            >
              Unenroll from this learning path
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({
  pathCourse,
  index,
  isEnrolled,
}: {
  pathCourse: PathCourse;
  index: number;
  isEnrolled: boolean;
}) {
  const isLocked = isEnrolled && pathCourse.is_unlocked === false;
  const isCompleted = pathCourse.progress?.is_completed;
  const courseProgress = pathCourse.progress?.progress || 0;

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl border ${
        isLocked
          ? 'border-gray-200 dark:border-gray-700 opacity-60'
          : isCompleted
          ? 'border-green-200 dark:border-green-800'
          : 'border-gray-200 dark:border-gray-700'
      } overflow-hidden`}
    >
      <div className="flex">
        {/* Order indicator */}
        <div
          className={`w-16 flex-shrink-0 flex flex-col items-center justify-center border-r ${
            isCompleted
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : isLocked
              ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}
        >
          {isCompleted ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : isLocked ? (
            <Lock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          ) : (
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {index + 1}
            </span>
          )}
        </div>

        {/* Course info */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {pathCourse.course.title}
                </h3>
                {!pathCourse.is_required && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                    Optional
                  </span>
                )}
              </div>

              {pathCourse.course.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                  {pathCourse.course.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{pathCourse.course.lesson_count || 0} lessons</span>
                {pathCourse.course.instructor && (
                  <span>By {pathCourse.course.instructor.full_name}</span>
                )}
              </div>

              {/* Progress bar for enrolled users */}
              {isEnrolled && !isLocked && !isCompleted && courseProgress > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Progress</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {courseProgress}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${courseProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action */}
            {!isLocked && (
              <Link
                href={`/course/${pathCourse.course.id}`}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isCompleted
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                }`}
              >
                {isCompleted ? 'Review' : 'Start'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Locked overlay message */}
      {isLocked && (
        <div className="absolute inset-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center px-4">
            <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complete the previous course to unlock
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
