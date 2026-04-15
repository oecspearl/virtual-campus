'use client';

interface CourseTabBarProps {
  courseId: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  discussionCount?: number;
  userRole?: string;
}

export default function CourseTabBar({
  courseId,
  activeTab = 'overview',
  onTabChange,
  discussionCount = 0,
  userRole = 'student',
}: CourseTabBarProps) {
  const isInstructor = ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(userRole);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'curriculum', label: 'Curriculum' },
    ...(isInstructor ? [{ key: 'sections', label: 'Sections' }] : []),
    ...(isInstructor ? [{ key: 'assessments', label: 'Assessments' }] : []),
    { key: 'discussions', label: 'Discussions', count: discussionCount },
    { key: 'grades', label: 'Grades' },
    ...(isInstructor ? [{ key: 'files', label: 'Files' }] : []),
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 sm:px-10 lg:px-12">
        <nav className="flex gap-0 overflow-x-auto scrollbar-hide -mb-px" aria-label="Course tabs">
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={`relative text-[13px] px-4 py-3 border-b-2 whitespace-nowrap transition-colors shrink-0 font-medium ${
                  active
                    ? ''
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
                style={active ? {
                  borderColor: 'var(--theme-primary)',
                  color: 'var(--theme-primary)',
                } : undefined}
              >
                {tab.label}
                {'count' in tab && (tab as any).count > 0 && (
                  <span
                    className="ml-1.5 text-[10px] px-1.5 py-px rounded-full font-semibold"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
                      color: 'var(--theme-primary)',
                    }}
                  >
                    {(tab as any).count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
