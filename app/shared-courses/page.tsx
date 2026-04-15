'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';

interface SharedCourse {
  share_id: string;
  course_id: string;
  permission: string;
  source_tenant: { id: string; name: string; slug: string } | null;
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    difficulty: string;
    subject_area: string | null;
    estimated_duration: string | null;
    modality: string;
    lesson_count: number;
  };
  enrollment: {
    id: string;
    status: string;
    progress_percentage: number;
  } | null;
  shared_at: string;
}

export default function SharedCourseCatalog() {
  const [courses, setCourses] = useState<SharedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/shared-courses');
      const data = await res.json();
      if (data.courses) setCourses(data.courses);
    } catch (error) {
      console.error('Error fetching shared courses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleEnroll = async (shareId: string) => {
    setEnrolling(shareId);
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/enroll`, {
        method: 'POST',
      });

      const data = await res.json();
      if (res.ok) {
        fetchCourses();
      } else {
        alert(data.error || 'Failed to enroll');
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Failed to enroll');
    } finally {
      setEnrolling(null);
    }
  };

  const handleDrop = async (shareId: string) => {
    if (!confirm('Are you sure you want to drop this course?')) return;

    try {
      const res = await fetch(`/api/shared-courses/${shareId}/enroll`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchCourses();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to drop course');
      }
    } catch (error) {
      console.error('Error dropping course:', error);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = !search ||
      c.course.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.course.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = !difficultyFilter || c.course.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const enrolledCourses = filteredCourses.filter(c => c.enrollment?.status === 'active');
  const availableCourses = filteredCourses.filter(c => !c.enrollment || c.enrollment.status !== 'active');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-80 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-100" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-3/4 bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                  <div className="h-4 w-1/2 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-display text-gray-900 tracking-tight mb-2">Shared Course Catalog</h1>
          <p className="text-sm text-gray-500">
            Browse and enroll in courses shared from other institutions
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Enrolled Courses */}
        {enrolledCourses.length > 0 && (
          <div className="mb-10">
            <h2 className="text-base font-display text-gray-900 mb-4 flex items-center gap-2">
              <Icon icon="mdi:school" className="w-5 h-5 text-green-600" />
              My Enrolled Shared Courses ({enrolledCourses.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrolledCourses.map(item => (
                <CourseCard
                  key={item.share_id}
                  item={item}
                  onEnroll={handleEnroll}
                  onDrop={handleDrop}
                  enrolling={enrolling}
                />
              ))}
            </div>
          </div>
        )}

        {/* Available Courses */}
        <div>
          <h2 className="text-base font-display text-gray-900 mb-4 flex items-center gap-2">
            <Icon icon="mdi:book-open-variant" className="w-5 h-5 text-blue-600" />
            Available Courses ({availableCourses.length})
          </h2>

          {availableCourses.length === 0 && enrolledCourses.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Icon icon="mdi:share-off" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-display text-gray-700 mb-2">No Shared Courses Available</h3>
              <p className="text-sm text-gray-500">
                There are no courses shared with your institution at this time.
              </p>
            </div>
          ) : availableCourses.length === 0 ? (
            <p className="text-gray-500 text-sm">
              You&apos;re enrolled in all available shared courses!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {availableCourses.map(item => (
                <CourseCard
                  key={item.share_id}
                  item={item}
                  onEnroll={handleEnroll}
                  onDrop={handleDrop}
                  enrolling={enrolling}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CourseCard({
  item,
  onEnroll,
  onDrop,
  enrolling,
}: {
  item: SharedCourse;
  onEnroll: (shareId: string) => void;
  onDrop: (shareId: string) => void;
  enrolling: string | null;
}) {
  const isEnrolled = item.enrollment?.status === 'active';
  const isCompleted = item.enrollment?.status === 'completed';

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div className="h-40 bg-gradient-to-br from-blue-600 to-blue-700 relative">
        {item.course.thumbnail ? (
          <img
            src={item.course.thumbnail}
            alt={item.course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Icon icon="mdi:book-open-variant" className="w-16 h-16 text-white/30" />
          </div>
        )}

        {/* Source Badge */}
        {item.source_tenant && (
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-full flex items-center gap-1">
            <Icon icon="mdi:domain" className="w-3.5 h-3.5" />
            {item.source_tenant.name}
          </div>
        )}

        {/* Difficulty Badge */}
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 text-gray-700 text-xs rounded-full font-medium capitalize">
          {item.course.difficulty}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{item.course.title}</h3>
        {item.course.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.course.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
          {item.course.lesson_count > 0 && (
            <span className="flex items-center gap-1">
              <Icon icon="mdi:file-document-outline" className="w-3.5 h-3.5" />
              {item.course.lesson_count} lessons
            </span>
          )}
          {item.course.estimated_duration && (
            <span className="flex items-center gap-1">
              <Icon icon="mdi:clock-outline" className="w-3.5 h-3.5" />
              {item.course.estimated_duration}
            </span>
          )}
          {item.course.modality && (
            <span className="flex items-center gap-1 capitalize">
              <Icon icon="mdi:laptop" className="w-3.5 h-3.5" />
              {item.course.modality}
            </span>
          )}
        </div>

        {/* Progress bar for enrolled */}
        {isEnrolled && item.enrollment && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{item.enrollment.progress_percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-green-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${item.enrollment.progress_percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-2">
          {isCompleted ? (
            <div className="w-full px-4 py-2.5 text-center text-green-700 bg-green-50 border border-green-200 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5">
              <Icon icon="mdi:check-circle" className="w-4 h-4" />
              Completed
            </div>
          ) : isEnrolled ? (
            <div className="flex gap-2">
              <Link href={`/shared-courses/${item.share_id}`} className="flex-1">
                <Button size="sm" className="w-full">
                  <Icon icon="mdi:play" className="w-4 h-4 mr-1" />
                  Continue
                </Button>
              </Link>
              <button
                onClick={() => onDrop(item.share_id)}
                className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                title="Drop course"
              >
                <Icon icon="mdi:close" className="w-4 h-4" />
              </button>
            </div>
          ) : item.permission === 'enroll' ? (
            <Button
              size="sm"
              className="w-full"
              onClick={() => onEnroll(item.share_id)}
              disabled={enrolling === item.share_id}
            >
              {enrolling === item.share_id ? (
                'Enrolling...'
              ) : (
                <>
                  <Icon icon="mdi:school" className="w-4 h-4 mr-1" />
                  Enroll
                </>
              )}
            </Button>
          ) : (
            <Link href={`/shared-courses/${item.share_id}`} className="block">
              <Button size="sm" variant="outline" className="w-full">
                <Icon icon="mdi:eye" className="w-4 h-4 mr-1" />
                View Course
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
