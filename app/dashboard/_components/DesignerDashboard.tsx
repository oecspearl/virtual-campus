import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';
import WelcomeHeader from './WelcomeHeader';
import AnnouncementBar from './AnnouncementBar';
import SidebarNotificationsWidget from './SidebarNotificationsWidget';
import Link from 'next/link';
import { Icon } from '@iconify/react';

const DESIGN_TOOLS = [
  { label: 'Create Course', description: 'Design new curriculum', icon: 'mdi:book-plus', href: '/courses/create', color: '#3B82F6' },
  { label: 'Create Lesson', description: 'Add learning content', icon: 'mdi:file-document-plus', href: '/lessons/create', color: '#10B981' },
  { label: 'Manage Lessons', description: 'Edit existing content', icon: 'mdi:file-document-edit', href: '/manage-lessons', color: '#8B5CF6' },
  { label: 'Question Banks', description: 'Shared question repos', icon: 'mdi:help-box-multiple', href: '/admin/question-banks', color: '#F59E0B' },
];

export default async function DesignerDashboard({ name }: { name: string }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();

  const [{ data: courses }, { data: lessons }] = await Promise.all([
    supabase.from('courses').select('id').eq('created_by', user.id),
    supabase.from('lessons').select('id').eq('created_by', user.id),
  ]);

  const courseCount = courses?.length || 0;
  const lessonCount = lessons?.length || 0;

  return (
    <div className="space-y-6">
      <WelcomeHeader name={name} />
      <AnnouncementBar />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Compact Stats */}
          <div className="flex gap-4">
            <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200/80 px-4 py-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Icon icon="mdi:book-open-variant" className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{courseCount}</p>
                <p className="text-xs text-gray-500">Courses Created</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200/80 px-4 py-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon icon="mdi:file-document-multiple" className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{lessonCount}</p>
                <p className="text-xs text-gray-500">Lessons Created</p>
              </div>
            </div>
          </div>

          {/* Design Tools */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Design Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DESIGN_TOOLS.map(tool => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200/80 hover:shadow-sm hover:border-gray-300 transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${tool.color}15` }}
                  >
                    <Icon icon={tool.icon} className="w-5 h-5" style={{ color: tool.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {tool.label}
                    </p>
                    <p className="text-xs text-gray-500">{tool.description}</p>
                  </div>
                  <Icon icon="mdi:chevron-right" className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 lg:flex-shrink-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            <SidebarNotificationsWidget />
          </div>
        </aside>
      </div>
    </div>
  );
}
