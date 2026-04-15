import Link from 'next/link';
import { Icon } from '@iconify/react';

interface AdminToolCardProps {
  icon: string;
  label: string;
  description: string;
  href: string;
  color: string;
}

export default function AdminToolCard({ icon, label, description, href, color }: AdminToolCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200/80 hover:shadow-md hover:border-gray-300 transition-all duration-200 text-center"
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon icon={icon} className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {label}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{description}</p>
      </div>
    </Link>
  );
}
