'use client';

import Image from 'next/image';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { stripHtml } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  subject_area: string;
  difficulty: string;
  published: boolean;
  featured: boolean;
  created_at: string;
}

type CourseAction =
  | { type: 'edit'; course: Course }
  | { type: 'togglePublish'; courseId: string; published: boolean }
  | { type: 'toggleFeatured'; courseId: string; featured: boolean }
  | { type: 'clone'; courseId: string; title: string }
  | { type: 'delete'; courseId: string; title: string };

interface CourseTableProps {
  courses: Course[];
  totalCount: number;
  selectedIds: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onAction: (action: CourseAction) => void;
  cloningId: string | null;
  hasFilters: boolean;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

export default function CourseTable({
  courses,
  totalCount,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  onClearSelection,
  onAction,
  cloningId,
  hasFilters,
}: CourseTableProps) {
  const allSelected = courses.length > 0 && selectedIds.length === courses.length;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Courses ({courses.length} of {totalCount})
        </h2>
        <div className="flex gap-2">
          <Button onClick={onSelectAll} variant="outline" className="text-sm">Select All</Button>
          <Button onClick={onClearSelection} variant="outline" className="text-sm">Clear</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => allSelected ? onClearSelection() : onSelectAll()}
                  className="h-4 w-4 text-oecs-lime-green focus:ring-oecs-lime-green border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {courses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  {hasFilters ? 'No courses match your search criteria.' : 'No courses found.'}
                </td>
              </tr>
            ) : (
              courses.map(course => (
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(course.id)}
                      onChange={() => onSelectToggle(course.id)}
                      className="h-4 w-4 text-oecs-lime-green focus:ring-oecs-lime-green border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {course.thumbnail && (
                        <Image className="h-10 w-10 rounded-lg object-cover mr-3" src={course.thumbnail} alt={course.title} width={40} height={40} unoptimized />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{course.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {stripHtml(course.description || '')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{course.subject_area}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${DIFFICULTY_STYLES[course.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                      {course.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${course.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {course.published ? 'Published' : 'Draft'}
                      </span>
                      {course.featured && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                          <Icon icon="material-symbols:star" className="w-3 h-3" /> Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(course.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      <button onClick={() => onAction({ type: 'edit', course })} className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50" title="Edit">
                        <Icon icon="material-symbols:edit" className="w-4 h-4" />
                      </button>
                      <button onClick={() => onAction({ type: 'togglePublish', courseId: course.id, published: course.published })} className={`p-1.5 rounded ${course.published ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`} title={course.published ? 'Unpublish' : 'Publish'}>
                        <Icon icon={course.published ? 'material-symbols:draft' : 'material-symbols:visibility'} className="w-4 h-4" />
                      </button>
                      <button onClick={() => onAction({ type: 'toggleFeatured', courseId: course.id, featured: course.featured })} className={`p-1.5 rounded ${course.featured ? 'text-orange-600 hover:bg-orange-50' : 'text-gray-400 hover:bg-gray-50'}`} title={course.featured ? 'Unfeature' : 'Feature'}>
                        <Icon icon={course.featured ? 'material-symbols:star' : 'material-symbols:star-outline'} className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAction({ type: 'clone', courseId: course.id, title: course.title })}
                        disabled={cloningId === course.id}
                        className="text-purple-600 hover:text-purple-800 p-1.5 rounded hover:bg-purple-50 disabled:opacity-50"
                        title="Clone"
                      >
                        <Icon icon={cloningId === course.id ? 'material-symbols:sync' : 'material-symbols:content-copy'} className={`w-4 h-4 ${cloningId === course.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button onClick={() => onAction({ type: 'delete', courseId: course.id, title: course.title })} className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50" title="Delete">
                        <Icon icon="material-symbols:delete" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
