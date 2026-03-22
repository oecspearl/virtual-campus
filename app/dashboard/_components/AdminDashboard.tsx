import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';
import WelcomeHeader from './WelcomeHeader';
import AnnouncementBar from './AnnouncementBar';
import AdminToolCard from './AdminToolCard';
import AdminSidebar from './AdminSidebar';

// Grouped admin tools by category for visual separation
const ADMIN_TOOL_GROUPS = [
  {
    title: 'User Management',
    tools: [
      { icon: 'mdi:account-group', label: 'Manage Users', description: 'User accounts & permissions', href: '/admin/users/manage', color: '#3B82F6' },
      { icon: 'mdi:alert-circle', label: 'At-Risk Students', description: 'Identify struggling students', href: '/admin/at-risk-students', color: '#EF4444' },
    ],
  },
  {
    title: 'Course Management',
    tools: [
      { icon: 'mdi:book-open-variant', label: 'Manage Courses', description: 'Course content & settings', href: '/admin/courses/manage', color: '#10B981' },
      { icon: 'mdi:folder-open', label: 'Categories', description: 'Course categories', href: '/admin/categories', color: '#059669' },
      { icon: 'mdi:school', label: 'Programmes', description: 'Multi-course learning paths', href: '/admin/programmes', color: '#D97706' },
      { icon: 'mdi:file-document-plus', label: 'Create Lesson', description: 'Add new lesson content', href: '/lessons/create', color: '#10B981' },
      { icon: 'mdi:file-document-edit', label: 'Manage Lessons', description: 'View & edit all lessons', href: '/manage-lessons', color: '#059669' },
      { icon: 'mdi:share-variant', label: 'Shared Courses', description: 'Cross-tenant course sharing', href: '/admin/shared-courses', color: '#7C3AED' },
    ],
  },
  {
    title: 'Assessments & Engagement',
    tools: [
      { icon: 'mdi:clipboard-text', label: 'Assignments', description: 'View & grade assignments', href: '/assignments', color: '#8B5CF6' },
      { icon: 'mdi:checkbox-marked-circle', label: 'Quizzes', description: 'Create & manage quizzes', href: '/quizzes', color: '#F59E0B' },
      { icon: 'mdi:help-box-multiple', label: 'Question Banks', description: 'Shared question repos', href: '/admin/question-banks', color: '#6366F1' },
      { icon: 'mdi:poll', label: 'Surveys', description: 'Course evaluations', href: '/surveys', color: '#14B8A6' },
      { icon: 'mdi:forum', label: 'Course Discussions', description: 'Graded & ungraded', href: '/admin/discussions', color: '#10B981' },
      { icon: 'mdi:message-text', label: 'Community Forum', description: 'Global discussions', href: '/discussions', color: '#3B82F6' },
    ],
  },
  {
    title: 'Analytics & Communication',
    tools: [
      { icon: 'mdi:chart-bar', label: 'Analytics', description: 'Learning insights', href: '/admin/analytics', color: '#6366F1' },
      { icon: 'mdi:file-document-multiple', label: 'Reports', description: 'Custom reports', href: '/admin/reports', color: '#0EA5E9' },
      { icon: 'mdi:bullhorn', label: 'Announcements', description: 'System-wide announcements', href: '/admin/announcements', color: '#F59E0B' },
      { icon: 'mdi:send', label: 'Send Notification', description: 'WhatsApp, SMS, email, push', href: '/admin/notifications/send', color: '#22C55E' },
    ],
  },
  {
    title: 'Certifications',
    tools: [
      { icon: 'mdi:certificate', label: 'Certificate Templates', description: 'Design & create', href: '/admin/certificates/templates', color: '#EC4899' },
      { icon: 'mdi:file-certificate', label: 'Manage Certificates', description: 'View issued certificates', href: '/admin/certificates/manage', color: '#BE185D' },
    ],
  },
  {
    title: 'Integrations & SIS',
    tools: [
      { icon: 'mdi:sync', label: 'SIS Integration', description: 'SonisWeb & imports', href: '/admin/sonisweb', color: '#7C3AED' },
      { icon: 'mdi:puzzle', label: 'LTI Tools', description: 'External tool integrations', href: '/admin/lti-tools', color: '#14B8A6' },
      { icon: 'mdi:cloud-upload', label: 'LTI Platforms', description: 'Platforms that launch this LMS', href: '/admin/lti-platforms', color: '#0EA5E9' },
      { icon: 'mdi:shield-lock', label: 'Proctoring', description: 'Respondus, ProctorU & more', href: '/admin/proctoring-services', color: '#6366F1' },
    ],
  },
  {
    title: 'System',
    tools: [
      { icon: 'mdi:cog', label: 'Platform Settings', description: 'System configuration', href: '/admin/settings', color: '#64748B' },
      { icon: 'mdi:brain', label: 'Adaptive Learning', description: 'Personalization rules', href: '/admin/adaptive-rules', color: '#8B5CF6' },
    ],
  },
];

const SUPER_ADMIN_GROUP = {
  title: 'Tenant Management',
  tools: [
    { icon: 'mdi:chart-line', label: 'System Dashboard', description: 'Cross-tenant overview', href: '/admin/system', color: '#10B981' },
    { icon: 'mdi:domain', label: 'Manage Tenants', description: 'View & edit tenants', href: '/admin/tenants', color: '#0D9488' },
    { icon: 'mdi:plus-circle', label: 'Create Tenant', description: 'Add new organization', href: '/admin/tenants', color: '#06B6D4' },
  ],
};

export default async function AdminDashboard({ name, role }: { name: string; role: string }) {
  let userCount: number | null = 0;
  let courseCount: number | null = 0;
  let enrollmentCount: number | null = 0;
  let certificateCount: number | null = 0;
  let tenantCount: number | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    const [usersRes, coursesRes, enrollmentsRes, certsRes] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }),
      serviceSupabase.from('certificates').select('*', { count: 'exact', head: true }),
    ]);

    userCount = usersRes.count;
    courseCount = coursesRes.count;
    enrollmentCount = enrollmentsRes.count;
    certificateCount = certsRes.count;

    if (role === 'super_admin') {
      const { count: tc } = await serviceSupabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });
      tenantCount = tc;
    }
  } catch (err) {
    console.error('AdminDashboard: Failed to fetch stats:', err);
  }

  const stats = [
    { label: 'Users', value: userCount || 0, icon: 'mdi:account-group', color: '#3B82F6' },
    { label: 'Courses', value: courseCount || 0, icon: 'mdi:book-open-variant', color: '#10B981' },
    { label: 'Enrollments', value: enrollmentCount || 0, icon: 'mdi:school', color: '#8B5CF6' },
    { label: 'Certificates', value: certificateCount || 0, icon: 'mdi:certificate', color: '#EC4899' },
    ...(tenantCount !== null ? [{ label: 'Tenants', value: tenantCount, icon: 'mdi:domain', color: '#0D9488' }] : []),
  ];

  const groups = [
    ...(role === 'super_admin' ? [SUPER_ADMIN_GROUP] : []),
    ...ADMIN_TOOL_GROUPS,
  ];

  return (
    <div className="space-y-6">
      <WelcomeHeader name={name} />
      <AnnouncementBar />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {groups.map(group => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{group.title}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.tools.map(tool => (
                  <AdminToolCard
                    key={tool.href}
                    icon={tool.icon}
                    label={tool.label}
                    description={tool.description}
                    href={tool.href}
                    color={tool.color}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 lg:flex-shrink-0">
          <AdminSidebar stats={stats} />
        </aside>
      </div>
    </div>
  );
}
