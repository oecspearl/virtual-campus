import Link from 'next/link';
import { Icon } from '@iconify/react';

interface AdminToolListItemProps {
  icon: string;
  label: string;
  description: string;
  href: string;
  color: string;
}

export default function AdminToolListItem({ icon, label, description, href, color }: AdminToolListItemProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200/80 hover:shadow-sm hover:border-gray-300 transition-all duration-200"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon icon={icon} className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {label}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>
      </div>
      <Icon icon="mdi:chevron-right" className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
    </Link>
  );
}
