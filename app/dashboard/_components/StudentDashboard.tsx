import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';
import WelcomeHeader from './WelcomeHeader';
import AnnouncementBar from './AnnouncementBar';
import ContinueLearningCard from './ContinueLearningCard';
import OnboardingWizard from './OnboardingWizard';
import CourseCard from './CourseCard';
import DashboardSidebar from './DashboardSidebar';
import MyProgrammesWidget from '@/app/components/student/MyProgrammesWidget';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import StaggeredGrid from './StaggeredGrid';

export default async function StudentDashboard({ name }: { name: string }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createServiceSupabaseClient();

  // Fetch enrollments with course data
  let enrollments: any[] = [];
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, courses(*), classes(id, name)')
      .eq('student_id', user.id)
      .eq('status', 'active');

    if (!error && data) {
      enrollments = data;
    }
  } catch (err) {
    console.error('Error fetching enrollments:', err);
  }

  return (
    <div className="space-y-6">
      {/* Onboarding for first-time students */}
      <OnboardingWizard userName={name} />

      {/* Welcome Header */}
      <WelcomeHeader name={name} />

      {/* Announcement Bar */}
      <AnnouncementBar />

      {/* Continue Learning — direct link to last lesson */}
      {enrollments.length > 0 && <ContinueLearningCard userId={user.id} />}

      {/* 2-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Course Cards */}
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

            {enrollments.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200/80 p-8 text-center">
                <Icon icon="mdi:book-open-variant" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No courses yet</h3>
                <p className="text-sm text-gray-500 mb-4">Browse available courses to get started</p>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                  style={{ background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))' }}
                >
                  <Icon icon="mdi:magnify" className="w-4 h-4" />
                  Browse Courses
                </Link>
              </div>
            ) : (
              <StaggeredGrid className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrollments.map((enrollment: any) => (
                  <CourseCard
                    key={enrollment.id}
                    courseId={enrollment.course_id}
                    title={enrollment.courses?.title || 'Untitled Course'}
                    description={enrollment.courses?.description}
                    thumbnail={enrollment.courses?.thumbnail}
                    progress={enrollment.progress_percentage || 0}
                    sectionName={enrollment.classes?.name || null}
                  />
                ))}
              </StaggeredGrid>
            )}
          </div>

          {/* My Programmes */}
          <MyProgrammesWidget />

          {/* Shared Course Catalog Link */}
          <div className="bg-white border border-gray-200/80 rounded-lg p-5 mt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}>
                <Icon icon="mdi:share-variant" className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Shared Courses</h3>
                <p className="text-xs text-gray-500">Courses from other institutions</p>
              </div>
            </div>
            <Link
              href="/shared-courses"
              className="inline-flex items-center gap-1.5 text-sm font-medium mt-1"
              style={{ color: 'var(--theme-primary)' }}
            >
              Browse Catalog
              <Icon icon="mdi:arrow-right" className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 lg:flex-shrink-0">
          <DashboardSidebar />
        </aside>
      </div>
    </div>
  );
}
