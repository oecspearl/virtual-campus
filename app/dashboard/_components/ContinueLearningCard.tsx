import { createServiceSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface ContinueLearningData {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  courseThumbnail: string | null;
  progressPercentage: number;
  totalLessons: number;
  completedLessons: number;
}

async function getContinueLearningData(userId: string): Promise<ContinueLearningData | null> {
  const supabase = await createServiceSupabaseClient();

  // Find the most recently accessed lesson across all active enrollments
  const { data: recentProgress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, last_accessed_at, status')
    .eq('student_id', userId)
    .neq('status', 'completed')
    .order('last_accessed_at', { ascending: false })
    .limit(1)
    .single();

  // ─── Cold path: no in-progress lesson, pick from active enrollments ───
  if (!recentProgress) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, progress_percentage, courses(id, title, thumbnail)')
      .eq('student_id', userId)
      .eq('status', 'active')
      .lt('progress_percentage', 100)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!enrollments) return null;

    const course = enrollments.courses as unknown as
      | { id: string; title: string; thumbnail: string | null }
      | null;

    // Lessons + completed-progress fetched in parallel — neither depends on
    // the other beyond the shared course_id.
    const [{ data: allLessons }, { data: completedProgress }] = await Promise.all([
      supabase
        .from('lessons')
        .select('id, title, order')
        .eq('course_id', enrollments.course_id)
        .eq('published', true)
        .order('order', { ascending: true }),
      supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('student_id', userId)
        .eq('status', 'completed'),
    ]);

    if (!allLessons || allLessons.length === 0) return null;

    const lessonIdSet = new Set(allLessons.map((l) => l.id));
    const completedIds = new Set(
      (completedProgress || [])
        .filter((p) => lessonIdSet.has(p.lesson_id))
        .map((p) => p.lesson_id)
    );
    const nextLesson = allLessons.find((l) => !completedIds.has(l.id)) || allLessons[0];

    return {
      lessonId: nextLesson.id,
      lessonTitle: nextLesson.title,
      courseId: enrollments.course_id,
      courseTitle: course?.title || 'Untitled Course',
      courseThumbnail: course?.thumbnail || null,
      progressPercentage: enrollments.progress_percentage || 0,
      totalLessons: allLessons.length,
      completedLessons: completedIds.size,
    };
  }

  // ─── Warm path: in-progress lesson found ─────────────────────────────
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, course_id, order')
    .eq('id', recentProgress.lesson_id)
    .single();

  if (!lesson) return null;

  // Course, enrollment, and lesson list for this course can all be fetched
  // in parallel — they only need lesson.course_id which we already have.
  const [
    { data: course },
    { data: enrollment },
    { data: allLessons },
  ] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, thumbnail')
      .eq('id', lesson.course_id)
      .single(),
    supabase
      .from('enrollments')
      .select('progress_percentage')
      .eq('student_id', userId)
      .eq('course_id', lesson.course_id)
      .eq('status', 'active')
      .single(),
    supabase
      .from('lessons')
      .select('id')
      .eq('course_id', lesson.course_id)
      .eq('published', true),
  ]);

  if (!course || !enrollment || !allLessons || allLessons.length === 0) return null;

  // Completed-count needs the lesson IDs from above; one final query.
  // Combined into a single COUNT so we don't fetch progress rows for
  // courses with hundreds of lessons.
  const lessonIds = allLessons.map((l) => l.id);
  const { count: completedLessons } = await supabase
    .from('lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', userId)
    .in('lesson_id', lessonIds)
    .eq('status', 'completed');

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    courseId: course.id,
    courseTitle: course.title,
    courseThumbnail: course.thumbnail,
    progressPercentage: enrollment.progress_percentage || 0,
    totalLessons: lessonIds.length,
    completedLessons: completedLessons || 0,
  };
}

export default async function ContinueLearningCard({ userId }: { userId: string }) {
  const data = await getContinueLearningData(userId);

  if (!data) return null;

  const initial = data.courseTitle.charAt(0).toUpperCase();

  return (
    <Link
      href={`/course/${data.courseId}/lesson/${data.lessonId}`}
      className="group block relative overflow-hidden rounded-xl border border-gray-200/80 transition-all duration-300 hover:shadow-lg hover:border-gray-300"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 6%, white), color-mix(in srgb, var(--theme-secondary) 4%, white))',
      }}
    >
      <div className="flex items-stretch">
        {/* Thumbnail / Initial */}
        <div className="hidden sm:flex w-32 flex-shrink-0 items-center justify-center relative overflow-hidden">
          {data.courseThumbnail ? (
            <img
              src={data.courseThumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-white text-3xl font-bold"
              style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}
            >
              {initial}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
                color: 'var(--theme-primary)',
              }}
            >
              <Icon icon="mdi:play-circle" className="w-3 h-3" />
              Continue Learning
            </span>
          </div>

          <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate group-hover:text-gray-800 transition-colors">
            {data.courseTitle}
          </h3>

          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 truncate">
            <Icon icon="mdi:book-open-page-variant-outline" className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Up next: {data.lessonTitle}</span>
          </p>

          {/* Progress */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(data.progressPercentage, 100)}%`,
                  background: 'linear-gradient(90deg, var(--theme-primary), var(--theme-secondary))',
                }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 flex-shrink-0">
              {data.completedLessons}/{data.totalLessons} lessons
            </span>
          </div>
        </div>

        {/* Arrow CTA */}
        <div className="flex items-center pr-4 sm:pr-5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            style={{
              backgroundColor: 'var(--theme-primary)',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--theme-primary) 30%, transparent)',
            }}
          >
            <Icon icon="mdi:play" className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
