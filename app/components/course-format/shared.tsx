'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';

// ---- Lesson Link Helper ----
// Renders a <Link> for regular courses or a <button> for shared courses (via onLessonClick)
export function LessonLink({ courseId, lessonId, onLessonClick, className, children, ...rest }: {
  courseId: string;
  lessonId: string;
  onLessonClick?: (lessonId: string) => void;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  if (onLessonClick) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); onLessonClick(lessonId); }}
        className={className}
        {...rest}
      >
        {children}
      </button>
    );
  }
  return (
    <Link href={`/course/${courseId}/lesson/${lessonId}`} className={className} {...rest}>
      {children}
    </Link>
  );
}

// ---- Helpers ----

export const CONTENT_TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  rich_text: { icon: 'material-symbols:article', label: 'Page', color: 'text-blue-600 bg-blue-100' },
  video: { icon: 'material-symbols:play-circle', label: 'Video', color: 'text-purple-600 bg-purple-100' },
  scorm: { icon: 'material-symbols:package-2', label: 'Interactive', color: 'text-teal-600 bg-teal-100' },
  quiz: { icon: 'material-symbols:quiz', label: 'Quiz', color: 'text-amber-600 bg-amber-100' },
  assignment: { icon: 'material-symbols:edit-document', label: 'Assignment', color: 'text-green-600 bg-green-100' },
  discussion: { icon: 'material-symbols:forum', label: 'Discussion', color: 'text-indigo-600 bg-indigo-100' },
  file: { icon: 'material-symbols:attach-file', label: 'File', color: 'text-gray-600 bg-gray-100' },
  audio: { icon: 'material-symbols:headphones', label: 'Audio', color: 'text-pink-600 bg-pink-100' },
  external: { icon: 'material-symbols:open-in-new', label: 'External', color: 'text-orange-600 bg-orange-100' },
  pdf: { icon: 'material-symbols:picture-as-pdf', label: 'PDF', color: 'text-red-600 bg-red-100' },
  document: { icon: 'material-symbols:description', label: 'Document', color: 'text-cyan-600 bg-cyan-100' },
};

export const getContentMeta = (type?: string) =>
  CONTENT_TYPE_META[type || 'rich_text'] || CONTENT_TYPE_META.rich_text;

export const StatusIcon: React.FC<{ status?: string; className?: string }> = ({ status, className = 'w-5 h-5' }) => {
  switch (status) {
    case 'completed':
      return <Icon icon="material-symbols:check-circle" className={`${className} text-green-500`} />;
    case 'in_progress':
      return <Icon icon="material-symbols:pending" className={`${className} text-blue-500`} />;
    default:
      return <Icon icon="material-symbols:circle-outline" className={`${className} text-gray-300`} />;
  }
};

// ============================================================================
// SHARED: Course Nav Rail (desktop sidebar + mobile drawer)
// ============================================================================
// Reused across Sequential, Topics, and Weekly formats per wireframe specs.
// Shows course navigation links, activity type quick-links, and progress bar.
// ============================================================================

export const NAV_LINKS = [
  { icon: 'material-symbols:home', label: 'Home', path: '' },
  { icon: 'material-symbols:view-module', label: 'Modules', path: '', active: true },
  { icon: 'material-symbols:assignment', label: 'Assignments', path: '/assignments' },
  { icon: 'material-symbols:grade', label: 'Grades', path: '/gradebook' },
  { icon: 'material-symbols:forum', label: 'Discussions', path: '/discussions' },
  { icon: 'material-symbols:folder', label: 'Files', path: '/files' },
];

export interface CourseNavRailProps {
  courseId: string;
  completedCount: number;
  totalCount: number;
  /** Activity type counts for quick-link sidebar */
  typeCounts?: Record<string, number>;
  /** Active filter callback for activity quick-links */
  onFilterType?: (type: string | null) => void;
  activeFilter?: string | null;
}

export const CourseNavRail: React.FC<CourseNavRailProps> = ({
  courseId,
  completedCount,
  totalCount,
  typeCounts,
  onFilterType,
  activeFilter,
}) => {
  const [showNav, setShowNav] = useState(false);
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const navContent = (mobile: boolean) => (
    <>
      {mobile && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Navigation</h3>
          <button onClick={() => setShowNav(false)} className="p-1 text-gray-400 hover:text-gray-600">
            <Icon icon="material-symbols:close" className="w-5 h-5" />
          </button>
        </div>
      )}
      {!mobile && (
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Course Navigation</h3>
      )}
      {NAV_LINKS.map(link => (
        <Link
          key={link.label}
          href={link.path ? `/course/${courseId}${link.path}` : `/course/${courseId}`}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            link.active
              ? 'bg-blue-50 text-blue-700 font-semibold border-l-3 border-blue-600'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
          onClick={mobile ? () => setShowNav(false) : undefined}
        >
          <Icon icon={link.icon} className={mobile ? 'w-5 h-5' : 'w-4.5 h-4.5'} />
          {link.label}
        </Link>
      ))}

      {/* Activity type quick-links */}
      {typeCounts && Object.keys(typeCounts).length > 0 && onFilterType && (
        <div className={mobile ? 'mt-3 pt-3 border-t border-gray-200' : 'mt-4 pt-3 border-t border-gray-200'}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Activities</h3>
          <button
            onClick={() => { onFilterType(null); if (mobile) setShowNav(false); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-full text-left transition-colors ${
              !activeFilter ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Icon icon="material-symbols:list" className="w-4 h-4" />
            All items ({totalCount})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => {
            const meta = getContentMeta(type);
            return (
              <button
                key={type}
                onClick={() => { onFilterType(activeFilter === type ? null : type); if (mobile) setShowNav(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-full text-left transition-colors ${
                  activeFilter === type ? `${meta.color} font-medium` : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon icon={meta.icon} className="w-4 h-4" />
                {meta.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      <div className={mobile ? 'mt-4 px-3 pt-3 border-t border-gray-200' : 'mt-5 px-3 pt-4 border-t border-gray-200'}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600">Course progress</span>
          {mobile && <span className="text-xs font-bold text-green-700">{progressPct}%</span>}
        </div>
        <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${mobile ? 'h-2' : 'h-2.5'}`}>
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {!mobile && (
          <span className="text-xs text-gray-500 mt-1.5 block">{completedCount} / {totalCount} items &middot; {progressPct}%</span>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop nav rail */}
      <div className="hidden lg:block w-48 flex-shrink-0">
        <div className="sticky top-24 space-y-1">
          {navContent(false)}
        </div>
      </div>

      {/* Mobile nav toggle */}
      <button
        onClick={() => setShowNav(!showNav)}
        className="lg:hidden fixed bottom-20 left-4 z-40 w-11 h-11 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        title="Course navigation"
      >
        <Icon icon="material-symbols:menu" className="w-5 h-5" />
      </button>
      {showNav && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowNav(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-lg p-4 space-y-1" onClick={e => e.stopPropagation()}>
            {navContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
