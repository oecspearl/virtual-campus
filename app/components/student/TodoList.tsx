'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  Circle,
  Plus,
  Calendar,
  Clock,
  AlertTriangle,
  Filter,
  ChevronDown,
  X,
  Trash2,
} from 'lucide-react';

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  source_type?: string;
  source_id?: string;
  course?: {
    id: string;
    title: string;
  };
  completed_at?: string;
  created_at: string;
}

interface TodoListProps {
  courseId?: string;
  compact?: boolean;
  limit?: number;
  showAddButton?: boolean;
  onTodoClick?: (todo: Todo) => void;
}

export default function TodoList({
  courseId,
  compact = false,
  limit,
  showAddButton = true,
  onTodoClick,
}: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTodo, setNewTodo] = useState({ title: '', due_date: '', priority: 'medium' as const });

  useEffect(() => {
    fetchTodos();
  }, [courseId, filter]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      let url = `/api/student/todos?include_completed=${filter === 'all' || filter === 'completed'}`;
      if (courseId) url += `&course_id=${courseId}`;
      if (filter === 'completed') url += '&status=completed';

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch todos');
      }

      let todoList = data.todos || [];
      if (limit) {
        todoList = todoList.slice(0, limit);
      }

      setTodos(todoList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
        setTodos(prev =>
          prev.map(todo =>
            todo.id === todoId
              ? { ...todo, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined }
              : todo
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/student/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTodos(prev => prev.filter(todo => todo.id !== todoId));
      }
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;

    try {
      const response = await fetch('/api/student/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodo.title,
          due_date: newTodo.due_date || null,
          priority: newTodo.priority,
          course_id: courseId || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTodos(prev => [data.todo, ...prev]);
        setNewTodo({ title: '', due_date: '', priority: 'medium' });
        setShowAddForm(false);
      }
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', isOverdue: true };
    if (diffDays === 0) return { text: 'Today', isToday: true };
    if (diffDays === 1) return { text: 'Tomorrow', isSoon: true };
    if (diffDays <= 7) return { text: `${diffDays} days`, isSoon: true };
    return { text: date.toLocaleDateString(), isOverdue: false };
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'}>
      {/* Header */}
      {!compact && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">To-Do List</h3>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              <option value="pending">Active</option>
              <option value="all">All</option>
              <option value="completed">Completed</option>
            </select>
            {showAddButton && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={addTodo} className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTodo.title}
            onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={newTodo.due_date}
              onChange={(e) => setNewTodo(prev => ({ ...prev, due_date: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
            <select
              value={newTodo.priority}
              onChange={(e) => setNewTodo(prev => ({ ...prev, priority: e.target.value as typeof newTodo.priority }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Todo list */}
      <div className={compact ? 'space-y-2' : 'divide-y divide-gray-200 dark:divide-gray-700'}>
        {todos.length === 0 ? (
          <div className={`${compact ? 'py-4' : 'p-8'} text-center text-gray-500 dark:text-gray-400`}>
            <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No tasks to show</p>
          </div>
        ) : (
          todos.map((todo) => {
            const dueInfo = todo.due_date ? formatDueDate(todo.due_date) : null;
            const isCompleted = todo.status === 'completed';

            return (
              <div
                key={todo.id}
                className={`group flex items-start gap-3 ${
                  compact ? 'p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'p-4'
                } ${isCompleted ? 'opacity-60' : ''}`}
              >
                <button
                  onClick={() => toggleTodo(todo.id, todo.status)}
                  className={`flex-shrink-0 mt-0.5 ${
                    isCompleted
                      ? 'text-green-500'
                      : 'text-gray-400 hover:text-blue-500'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onTodoClick?.(todo)}
                >
                  <p className={`text-sm font-medium ${
                    isCompleted
                      ? 'line-through text-gray-500 dark:text-gray-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {todo.title}
                  </p>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {todo.course && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {todo.course.title}
                      </span>
                    )}
                    {dueInfo && !isCompleted && (
                      <span className={`text-xs flex items-center gap-1 ${
                        dueInfo.isOverdue
                          ? 'text-red-600 dark:text-red-400'
                          : dueInfo.isToday || dueInfo.isSoon
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {dueInfo.isOverdue && <AlertTriangle className="w-3 h-3" />}
                        <Clock className="w-3 h-3" />
                        {dueInfo.text}
                      </span>
                    )}
                    {!compact && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                    )}
                  </div>
                </div>

                {!todo.source_type && (
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
