'use client';

import { Icon } from '@iconify/react';
import { ALL_ROLES } from '@/lib/rbac';

interface School { id: string; name: string; }
interface Course { id: string; title: string; }

export interface UserFilterValues {
  search: string;
  role: string;
  school: string;
  courseFilter: string;
}

interface UserFiltersProps {
  filters: UserFilterValues;
  onFiltersChange: (filters: UserFilterValues) => void;
  viewMode: 'all' | 'byCourse';
  onViewModeChange: (mode: 'all' | 'byCourse') => void;
  schools: School[];
  courses: Course[];
}

export default function UserFilters({ filters, onFiltersChange, viewMode, onViewModeChange, schools, courses }: UserFiltersProps) {
  const update = (key: keyof UserFilterValues, value: string) =>
    onFiltersChange({ ...filters, [key]: value });

  const hasFilters = !!(filters.search || filters.role || filters.school || filters.courseFilter);

  return (
    <div className="bg-white rounded-lg shadow px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Icon icon="material-symbols:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Role */}
        <select
          value={filters.role}
          onChange={(e) => update('role', e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          disabled={viewMode === 'byCourse'}
        >
          <option value="">All roles</option>
          {ALL_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>

        {/* School */}
        <select
          value={filters.school}
          onChange={(e) => update('school', e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All schools</option>
          <option value="__none__">No school</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Course (By Course view only) */}
        {viewMode === 'byCourse' && (
          <select
            value={filters.courseFilter}
            onChange={(e) => update('courseFilter', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        )}

        {/* View Toggle */}
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
          <button
            onClick={() => onViewModeChange('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => onViewModeChange('byCourse')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'byCourse' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            By Course
          </button>
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={() => onFiltersChange({ search: '', role: '', school: '', courseFilter: '' })}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Clear filters"
          >
            <Icon icon="material-symbols:filter-alt-off" className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
