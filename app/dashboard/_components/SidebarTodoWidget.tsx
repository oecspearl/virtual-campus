'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface TodoItem {
  id: string;
  title: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  source_type?: string | null;
  course_title?: string | null;
}

function formatDueDate(dateStr: string | null): { text: string; urgency: string } {
  if (!dateStr) return { text: 'No due date', urgency: 'text-gray-400' };
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, urgency: 'text-red-600 font-medium' };
  if (diffDays === 0) return { text: 'Due today', urgency: 'text-orange-600 font-medium' };
  if (diffDays === 1) return { text: 'Due tomorrow', urgency: 'text-orange-500' };
  if (diffDays <= 7) return { text: `Due in ${diffDays} days`, urgency: 'text-gray-600' };
  return { text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgency: 'text-gray-500' };
}

function getSourceIcon(sourceType?: string | null) {
  if (sourceType === 'assignment') return 'mdi:clipboard-text-outline';
  if (sourceType === 'quiz') return 'mdi:help-circle-outline';
  return 'mdi:checkbox-blank-circle-outline';
}

export default function SidebarTodoWidget() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/todos?include_completed=false&limit=7')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          // Combine overdue, today, and upcoming
          const items = [
            ...(data.overdue || []),
            ...(data.today || []),
            ...(data.upcoming || []),
          ].slice(0, 7);
          setTodos(items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icon icon="mdi:format-list-checks" className="w-4 h-4 text-blue-500" />
          To Do
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="px-4 py-6 text-center">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : todos.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            Nothing to do — you&apos;re all caught up!
          </div>
        ) : (
          todos.map(todo => {
            const due = formatDueDate(todo.due_date);
            return (
              <div key={todo.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-2.5">
                  <Icon
                    icon={getSourceIcon(todo.source_type)}
                    className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-tight line-clamp-1">{todo.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs ${due.urgency}`}>{due.text}</span>
                      {todo.course_title && (
                        <span className="text-xs text-gray-400 truncate">· {todo.course_title}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {todos.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <Link href="/student/todos" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View All Tasks →
          </Link>
        </div>
      )}
    </div>
  );
}
