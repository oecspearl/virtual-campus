'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckSquare, Circle, CheckCircle2, AlertCircle, Clock, Flag } from 'lucide-react';

interface Todo {
  id: string;
  title: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: string;
  course?: { id: string; title: string } | null;
}

interface Stats {
  overdue: number;
  today: number;
  upcoming: number;
}

export default function TasksPreviewWidget() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<Stats>({ overdue: 0, today: 0, upcoming: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await fetch('/api/student/todos');

      if (response.ok) {
        const data = await response.json();
        // Get overdue and today tasks first, then upcoming
        const priorityTodos = [
          ...(data.grouped?.overdue || []),
          ...(data.grouped?.today || []),
          ...(data.grouped?.upcoming || []),
        ].slice(0, 5);
        setTodos(priorityTodos);
        setStats({
          overdue: data.stats?.overdue || 0,
          today: data.stats?.today || 0,
          upcoming: data.stats?.upcoming || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (todoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    try {
      const response = await fetch(`/api/student/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchTodos();
      }
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  const getDueStatus = (dueDate: string | null) => {
    if (!dueDate) return null;

    const date = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dueDay < today) {
      return { label: 'Overdue', className: 'text-red-600 bg-red-50' };
    } else if (dueDay.getTime() === today.getTime()) {
      return { label: 'Today', className: 'text-amber-600 bg-amber-50' };
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center">
              <CheckSquare className="w-5 h-5 mr-2" />
              My Tasks
            </h3>
            <p className="text-blue-100 text-sm">
              {stats.overdue > 0 && (
                <span className="text-red-200 font-medium">{stats.overdue} overdue • </span>
              )}
              {stats.today} due today • {stats.upcoming} upcoming
            </p>
          </div>
          <Link
            href="/student/todos"
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
          >
            View All
          </Link>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-5 h-5 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">All caught up!</p>
            <p className="text-gray-400 text-xs mt-1">No pending tasks</p>
            <Link
              href="/student/todos"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
            >
              Add a task →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map(todo => {
              const dueStatus = getDueStatus(todo.due_date);
              const isCompleted = todo.status === 'completed';

              return (
                <div
                  key={todo.id}
                  className={`flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors ${
                    isCompleted ? 'opacity-60' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleTodo(todo.id, todo.status)}
                    className="flex-shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 hover:text-blue-500 transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-gray-900 text-sm truncate ${isCompleted ? 'line-through' : ''}`}>
                      {todo.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      {dueStatus && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${dueStatus.className}`}>
                          {dueStatus.label}
                        </span>
                      )}
                      {todo.course && (
                        <span className="text-xs text-gray-400 truncate">
                          {todo.course.title}
                        </span>
                      )}
                    </div>
                  </div>
                  <Flag className={`w-4 h-4 flex-shrink-0 ${getPriorityColor(todo.priority)}`} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
