import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';
import WelcomeHeader from './WelcomeHeader';
import AnnouncementBar from './AnnouncementBar';
import ContinueLearningCard from './ContinueLearningCard';
import OnboardingWizard from './OnboardingWizard';
import DashboardSidebar from './DashboardSidebar';
import MyProgrammesWidget from '@/app/components/student/MyProgrammesWidget';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import MyCoursesList from './MyCoursesList';

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
          {/* Course Cards with Grid/List toggle */}
          <MyCoursesList enrollments={enrollments} />

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
