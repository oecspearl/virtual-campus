'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface CurriculumQuiz {
  id: string;
  title: string;
  description?: string;
  points?: number;
  time_limit?: number;
  due_date?: string;
  published: boolean;
  curriculum_order?: number;
}

interface CurriculumAssignment {
  id: string;
  title: string;
  description?: string;
  points?: number;
  due_date?: string;
  published: boolean;
  curriculum_order?: number;
}

interface CurriculumItemsListProps {
  courseId: string;
  isInstructor?: boolean;
}

export default function CurriculumItemsList({ courseId, isInstructor = false }: CurriculumItemsListProps) {
  const [quizzes, setQuizzes] = React.useState<CurriculumQuiz[]>([]);
  const [assignments, setAssignments] = React.useState<CurriculumAssignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const fetchCurriculumItems = React.useCallback(async () => {
    try {
      // Fetch quizzes and assignments that should appear in curriculum
      const [quizzesRes, assignmentsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/curriculum-quizzes`),
        fetch(`/api/courses/${courseId}/curriculum-assignments`)
      ]);

      if (quizzesRes.ok) {
        const data = await quizzesRes.json();
        setQuizzes(data.quizzes || []);
      }

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching curriculum items:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    fetchCurriculumItems();
  }, [fetchCurriculumItems]);

  const handleDelete = async (type: 'quiz' | 'assignment', id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(id);
    try {
      const endpoint = type === 'quiz' ? `/api/quizzes/${id}` : `/api/assignments/${id}`;
      const response = await fetch(endpoint, { method: 'DELETE' });

      if (response.ok) {
        // Refresh the list
        await fetchCurriculumItems();
        alert(`${type === 'quiz' ? 'Quiz' : 'Assignment'} deleted successfully`);
      } else {
        const errorData = await response.json();
        alert(`Failed to delete: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  // Combine and sort items by curriculum_order
  const curriculumItems = React.useMemo(() => {
    const items = [
      ...quizzes.map(q => ({ ...q, type: 'quiz' as const })),
      ...assignments.map(a => ({ ...a, type: 'assignment' as const }))
    ];
    return items.sort((a, b) => (a.curriculum_order || 999) - (b.curriculum_order || 999));
  }, [quizzes, assignments]);

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Icon icon="material-symbols:hourglass-empty" className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading curriculum items...
      </div>
    );
  }

  if (curriculumItems.length === 0) {
    return null; // Don't show the section if there are no curriculum items
  }

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Icon icon="material-symbols:assignment" className="w-4 h-4" />
        Course Assessments
      </h3>
      <div className="space-y-2">
        {curriculumItems.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className={`block p-4 rounded-lg border transition-all hover:shadow-md ${
              item.type === 'quiz'
                ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                : 'bg-blue-50 border-blue-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                href={item.type === 'quiz' ? `/quiz/${item.id}/attempt` : `/assignment/${item.id}`}
                className="flex items-start gap-3 flex-1 min-w-0"
              >
                <div className={`p-2 rounded-lg ${
                  item.type === 'quiz' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  <Icon
                    icon={item.type === 'quiz' ? 'material-symbols:quiz' : 'material-symbols:assignment'}
                    className={`w-5 h-5 ${
                      item.type === 'quiz' ? 'text-amber-600' : 'text-blue-600'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.type === 'quiz'
                        ? 'bg-amber-200 text-amber-700'
                        : 'bg-blue-200 text-blue-700'
                    }`}>
                      {item.type === 'quiz' ? 'Quiz' : 'Assignment'}
                    </span>
                    {!item.published && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                        Draft
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 mt-1 truncate">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                    {item.points && (
                      <span className="flex items-center gap-1">
                        <Icon icon="material-symbols:star" className="w-3 h-3" />
                        {item.points} points
                      </span>
                    )}
                    {item.type === 'quiz' && (item as CurriculumQuiz).time_limit && (
                      <span className="flex items-center gap-1">
                        <Icon icon="material-symbols:timer" className="w-3 h-3" />
                        {(item as CurriculumQuiz).time_limit} min
                      </span>
                    )}
                    {item.due_date && (
                      <span className="flex items-center gap-1">
                        <Icon icon="material-symbols:calendar-today" className="w-3 h-3" />
                        Due: {formatDueDate(item.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isInstructor && (
                  <>
                    <Link
                      href={item.type === 'quiz' ? `/quizzes/${item.id}/edit` : `/assignments/${item.id}/edit`}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={`Edit ${item.type}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon icon="material-symbols:edit-outline" className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(item.type, item.id, item.title);
                      }}
                      disabled={deleting === item.id}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title={`Delete ${item.type}`}
                    >
                      {deleting === item.id ? (
                        <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon icon="material-symbols:delete-outline" className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
                <Link
                  href={item.type === 'quiz' ? `/quiz/${item.id}/attempt` : `/assignment/${item.id}`}
                  className="p-1"
                >
                  <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-400" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
