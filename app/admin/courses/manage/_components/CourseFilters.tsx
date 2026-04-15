'use client';

import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';

export interface CourseFilterValues {
  search: string;
  subject: string;
  difficulty: string;
  status: string;
}

interface CourseFiltersProps {
  filters: CourseFilterValues;
  onFiltersChange: (filters: CourseFilterValues) => void;
  subjects: string[];
}

export default function CourseFilters({ filters, onFiltersChange, subjects }: CourseFiltersProps) {
  const set = (field: keyof CourseFilterValues, value: string) =>
    onFiltersChange({ ...filters, [field]: value });

  const clear = () => onFiltersChange({ search: '', subject: '', difficulty: '', status: '' });

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search courses..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
          <select
            value={filters.subject}
            onChange={(e) => set('subject', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Difficulty</label>
          <select
            value={filters.difficulty}
            onChange={(e) => set('difficulty', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => set('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={clear} variant="outline" className="flex-1 flex items-center justify-center gap-2 text-sm">
            <Icon icon="material-symbols:clear" className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
