import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';
import WelcomeHeader from './WelcomeHeader';
import AnnouncementBar from './AnnouncementBar';
import InstructorCourseCard from './InstructorCourseCard';
import InstructorSidebar from './InstructorSidebar';
import Link from 'next/link';
import { Icon } from '@iconify/react';

const QUICK_ACTIONS = [
  { label: 'Create Course', icon: 'mdi:book-plus', href: '/courses/create', color: '#3B82F6' },
  { label: 'Create Lesson', icon: 'mdi:file-document-plus', href: '/lessons/create', color: '#10B981' },
  { label: 'Create Class', icon: 'mdi:school', href: '/classes/create', color: '#6366F1' },
  { label: 'Assignments', icon: 'mdi:clipboard-text', href: '/assignments', color: '#8B5CF6' },
  { label: 'Surveys', icon: 'mdi:poll', href: '/surveys', color: '#14B8A6' },
  { label: 'Discussions', icon: 'mdi:forum', href: '/admin/discussions', color: '#F59E0B' },
  { label: 'Community', icon: 'mdi:account-group', href: '/discussions', color: '#EC4899' },
];

const COLLABORATION_LINKS = [
  { label: 'Forums', description: 'Discuss teaching strategies', icon: 'mdi:forum', href: '/lecturers/forums', color: '#3B82F6' },
  { label: 'Resource Library', description: 'Share teaching materials', icon: 'mdi:folder-open', href: '/lecturers/resources', color: '#10B981' },
  { label: 'Staff Room', description: 'Chat with colleagues', icon: 'mdi:chat', href: '/lecturers/chat', color: '#8B5CF6' },
];

export default async function InstructorDashboard({ name }: { name: string }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();

  // Fetch instructor's courses via course_instructors
  let courses: any[] = [];
  try {
    const { data: classes } = await supabase
      .from('classes')
      .select(`
        *,
        course_instructors!inner(instructor_id),
        courses(*)
      `)
      .eq('course_instructors.instructor_id', user.id);

    if (classes) {
      // Deduplicate courses and count students per course
      const courseMap = new Map<string, { course: any; studentCount: number }>();
      for (const cls of classes) {
        if (cls.courses?.id && !courseMap.has(cls.courses.id)) {
          courseMap.set(cls.courses.id, { course: cls.courses, studentCount: 0 });
        }
      }

      // Get student counts per course
      const courseIds = Array.from(courseMap.keys());
      if (courseIds.length > 0) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .in('course_id', courseIds)
          .eq('status', 'active');

        if (enrollments) {
          for (const e of enrollments) {
            const entry = courseMap.get(e.course_id);
            if (entry) entry.studentCount++;
          }
        }
      }

      courses = Array.from(courseMap.values());
    }
  } catch (err) {
    console.error('Error fetching instructor courses:', err);
  }

  return (
    <div className="space-y-6">
      <WelcomeHeader name={name} />
      <AnnouncementBar />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* My Courses */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Courses</h2>
              <Link
                href="/my-courses"
                className="text-sm font-medium flex items-center gap-1"
                style={{ color: 'var(--theme-primary)' }}
              >
                View All
                <Icon icon="mdi:chevron-right" className="w-4 h-4" />
              </Link>
            </div>

            {courses.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200/80 p-8 text-center">
                <Icon icon="mdi:school-outline" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No courses yet</h3>
                <p className="text-sm text-gray-500 mb-4">Create your first course to get started</p>
                <Link
                  href="/courses/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                  style={{ background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))' }}
                >
                  <Icon icon="mdi:plus" className="w-4 h-4" />
                  Create Course
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map(({ course, studentCount }) => (
                  <InstructorCourseCard
                    key={course.id}
                    courseId={course.id}
                    title={course.title || 'Untitled Course'}
                    description={course.description}
                    thumbnail={course.thumbnail}
                    studentCount={studentCount}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Teaching Tools</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-2.5 p-3 bg-white rounded-lg border border-gray-200/80 hover:shadow-sm hover:border-gray-300 transition-all"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <Icon icon={action.icon} className="w-4 h-4" style={{ color: action.color }} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Lecturer Collaboration */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Collaboration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {COLLABORATION_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200/80 hover:shadow-sm hover:border-gray-300 transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${link.color}15` }}
                  >
                    <Icon icon={link.icon} className="w-5 h-5" style={{ color: link.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-[var(--theme-primary)] transition-colors">
                      {link.label}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1">{link.description}</p>
                  </div>
                  <Icon icon="mdi:chevron-right" className="w-4 h-4 text-gray-300 group-hover:text-[var(--theme-primary)] flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 lg:flex-shrink-0">
          <InstructorSidebar />
        </aside>
      </div>
    </div>
  );
}
