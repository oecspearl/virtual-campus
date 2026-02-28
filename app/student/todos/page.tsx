'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Plus,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  Flag,
  BookOpen,
  X,
  RefreshCw,
} from 'lucide-react';

interface Todo {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  course_id: string | null;
  source_type: string | null;
  source_id: string | null;
  completed_at: string | null;
  created_at: string;
  course?: { id: string; title: string } | null;
}

interface GroupedTodos {
  overdue: Todo[];
  today: Todo[];
  upcoming: Todo[];
  completed: Todo[];
}

interface Stats {
  total: number;
  overdue: number;
  today: number;
  upcoming: number;
  completed: number;
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [grouped, setGrouped] = useState<GroupedTodos>({ overdue: [], today: [], upcoming: [], completed: [] });
  const [stats, setStats] = useState<Stats>({ total: 0, overdue: 0, today: 0, upcoming: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showNewTodo, setShowNewTodo] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    fetchTodos();
  }, [showCompleted]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const url = showCompleted
        ? '/api/student/todos?include_completed=true'
        : '/api/student/todos';

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setTodos(data.todos || []);
        setGrouped(data.grouped || { overdue: [], today: [], upcoming: [], completed: [] });
        setStats(data.stats || { total: 0, overdue: 0, today: 0, upcoming: 0, completed: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncTodos = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/student/todos/sync', {
        method: 'POST',
      });

      if (response.ok) {
        await fetchTodos();
      }
    } catch (err) {
      console.error('Failed to sync todos:', err);
    } finally {
      setSyncing(false);
    }
  };

  const createTodo = async () => {
    if (!newTodo.title.trim()) return;

    try {
      const response = await fetch('/api/student/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodo.title.trim(),
          description: newTodo.description.trim() || null,
          due_date: newTodo.due_date || null,
          priority: newTodo.priority,
        }),
      });

      if (response.ok) {
        setNewTodo({ title: '', description: '', due_date: '', priority: 'medium' });
        setShowNewTodo(false);
        fetchTodos();
      }
    } catch (err) {
      console.error('Failed to create todo:', err);
    }
  };

  const toggleTodoStatus = async (todo: Todo) => {
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';

    try {
      const response = await fetch(`/api/student/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchTodos();
      }
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  const deleteTodo = async (todoId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/student/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTodos(prev => prev.filter(t => t.id !== todoId));
        fetchTodos();
      }
    } catch (err) {
      console.error('Failed to delete todo:', err);
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

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dueDate < today) {
      return { text: 'Overdue', className: 'text-red-600 bg-red-50 dark:bg-red-900/20' };
    } else if (dueDate.getTime() === today.getTime()) {
      return { text: 'Today', className: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' };
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      return { text: 'Tomorrow', className: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' };
    } else {
      return {
        text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        className: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300',
      };
    }
  };

  const renderTodoItem = (todo: Todo) => {
    const dueInfo = formatDueDate(todo.due_date);
    const isCompleted = todo.status === 'completed';

    return (
      <div
        key={todo.id}
        className={`group flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow ${
          isCompleted ? 'opacity-60' : ''
        }`}
      >
        <button
          onClick={() => toggleTodoStatus(todo)}
          className="flex-shrink-0 mt-0.5"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300 hover:text-blue-500 transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-medium text-gray-900 dark:text-white ${isCompleted ? 'line-through' : ''}`}>
              {todo.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Flag className={`w-4 h-4 ${getPriorityColor(todo.priority)}`} />
              <button
                onClick={() => deleteTodo(todo.id)}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          </div>

          {todo.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {todo.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            {dueInfo && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${dueInfo.className}`}>
                <Calendar className="w-3 h-3" />
                {dueInfo.text}
              </span>
            )}
            {todo.course && (
              <Link
                href={`/course/${todo.course.id}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <BookOpen className="w-3 h-3" />
                {todo.course.title}
              </Link>
            )}
            {todo.source_type && (
              <span className="text-gray-400 dark:text-gray-500 capitalize">
                From: {todo.source_type}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, items: Todo[], icon: React.ReactNode, emptyMessage: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {icon}
          {title}
          <span className="ml-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
            {items.length}
          </span>
        </h2>
        <div className="space-y-2">
          {items.map(renderTodoItem)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <CheckSquare className="w-7 h-7 text-blue-600" />
              My Tasks
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your assignments and to-dos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncTodos}
              disabled={syncing}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
              title="Sync from deadlines"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowNewTodo(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Overdue</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.today}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Due Today</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.upcoming}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* New Todo Form */}
        {showNewTodo && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Task</h2>
              <button
                onClick={() => setShowNewTodo(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  placeholder="Add more details..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTodo.due_date}
                    onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTodo.priority}
                    onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewTodo(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={createTodo}
                  disabled={!newTodo.title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Completed */}
        <div className="flex items-center justify-end mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Show completed tasks
          </label>
        </div>

        {/* Todos List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : todos.length === 0 && !showCompleted ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              All caught up!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You have no pending tasks. Create a new task or sync from your course deadlines.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowNewTodo(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
              <button
                onClick={syncTodos}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync Deadlines
              </button>
            </div>
          </div>
        ) : (
          <div>
            {renderSection(
              'Overdue',
              grouped.overdue,
              <AlertCircle className="w-4 h-4 text-red-500" />,
              'No overdue tasks'
            )}
            {renderSection(
              'Due Today',
              grouped.today,
              <Clock className="w-4 h-4 text-amber-500" />,
              'Nothing due today'
            )}
            {renderSection(
              'Upcoming',
              grouped.upcoming,
              <Calendar className="w-4 h-4 text-blue-500" />,
              'No upcoming tasks'
            )}
            {showCompleted && renderSection(
              'Completed',
              grouped.completed,
              <CheckCircle2 className="w-4 h-4 text-green-500" />,
              'No completed tasks'
            )}
          </div>
        )}
      </div>
    </div>
  );
}
