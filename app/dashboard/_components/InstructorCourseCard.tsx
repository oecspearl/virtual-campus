import Link from 'next/link';
import { Icon } from '@iconify/react';

const CARD_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
];

function getCardColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

interface InstructorCourseCardProps {
  courseId: string;
  title: string;
  description?: string;
  thumbnail?: string;
  studentCount: number;
}

export default function InstructorCourseCard({
  courseId,
  title,
  description,
  thumbnail,
  studentCount,
}: InstructorCourseCardProps) {
  const color = getCardColor(courseId);

  return (
    <Link
      href={`/course/${courseId}`}
      className="group bg-white rounded-lg border border-gray-200/80 overflow-hidden hover:shadow-md transition-all duration-200"
    >
      {/* Color bar */}
      <div className="h-1" style={{ backgroundColor: color }} />

      {/* Thumbnail / Fallback */}
      <div className="h-24 relative overflow-hidden bg-gray-50">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)` }}
          >
            <span className="text-3xl font-bold" style={{ color }}>
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{description}</p>
        )}

        {/* Student count */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Icon icon="mdi:account-group" className="w-3.5 h-3.5" />
            <span>{studentCount} student{studentCount !== 1 ? 's' : ''}</span>
          </div>
          <Icon
            icon="mdi:arrow-right"
            className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors"
          />
        </div>
      </div>
    </Link>
  );
}
