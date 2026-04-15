'use client';

import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface CourseStatsCardsProps {
  stats: {
    total: number;
    published: number;
    draft: number;
    subjectCount: number;
  };
}

const CARDS = [
  { key: 'total', label: 'Total Courses', icon: 'material-symbols:school', bg: 'bg-blue-100', color: 'text-blue-600' },
  { key: 'published', label: 'Published', icon: 'material-symbols:visibility', bg: 'bg-green-100', color: 'text-green-600' },
  { key: 'draft', label: 'Drafts', icon: 'material-symbols:draft', bg: 'bg-yellow-100', color: 'text-yellow-600' },
  { key: 'subjectCount', label: 'Subjects', icon: 'material-symbols:analytics', bg: 'bg-purple-100', color: 'text-purple-600' },
] as const;

export default function CourseStatsCards({ stats }: CourseStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {CARDS.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white rounded-lg shadow p-5"
        >
          <div className="flex items-center">
            <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
              <Icon icon={card.icon} className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-gray-900">{stats[card.key]}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
