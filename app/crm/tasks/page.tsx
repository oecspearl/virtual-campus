'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Task {
  id: string;
  title: string;
  description: string | null;
  student_id: string | null;
  student_name: string | null;
  assigned_to: string;
  assigned_to_name: string | null;
  created_by_name: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  source: string;
  created_at: string;
}

const PRIORITY_BADGES: Record<string, { color: string; icon: string }> = {
  low: { color: 'text-gray-500', icon: 'mdi:arrow-down' },
  medium: { color: 'text-blue-600', icon: 'mdi:minus' },
  high: { color: 'text-orange-600', icon: 'mdi:arrow-up' },
  urgent: { color: 'text-red-600', icon: 'mdi:alert' },
};

const PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-gray-300',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const LIMIT = 50;

export default function CRMTasksPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [mineOnly, setMineOnly] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Create/Edit form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit/Delete state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, mineOnly]);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, mineOnly, page]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(LIMIT), page: String(page) });
      if (statusFilter) params.set('status', statusFilter);
      if (mineOnly) params.set('mine', 'true');
      const res = await fetch(`/api/crm/tasks?${params}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { router.push('/dashboard'); return; }
        return;
      }
      const data = await res.json();
      setTasks(data.tasks || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('CRM Tasks: Error', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/crm/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast('Task updated', 'success');
        fetchTasks();
      } else {
        showToast('Failed to update task status', 'error');
      }
    } catch (error) {
      console.error('Task status update error:', error);
      showToast('Failed to update task status', 'error');
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;

    try {
      setCreating(true);
      const res = await fetch('/api/crm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          priority: newPriority,
          due_date: newDueDate || null,
          assigned_to: 'self', // Will be replaced by the API with current user
        }),
      });

      if (res.ok) {
        showToast('Task created', 'success');
        closeModal();
        fetchTasks();
      } else {
        showToast('Failed to create task', 'error');
      }
    } catch (error) {
      console.error('Task create error:', error);
      showToast('Failed to create task', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editingTask || !newTitle.trim()) return;

    try {
      setCreating(true);
      const res = await fetch(`/api/crm/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          priority: newPriority,
          due_date: newDueDate || null,
        }),
      });

      if (res.ok) {
        showToast('Task updated', 'success');
        closeModal();
        fetchTasks();
      } else {
        showToast('Failed to update task status', 'error');
      }
    } catch (error) {
      console.error('Task edit error:', error);
      showToast('Failed to update task status', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task? This cannot be undone.')) return;

    try {
      setDeletingTaskId(taskId);
      const res = await fetch(`/api/crm/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Task deleted', 'success');
        fetchTasks();
      } else {
        showToast('Failed to delete task', 'error');
      }
    } catch (error) {
      console.error('Task delete error:', error);
      showToast('Failed to delete task', 'error');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setNewTitle(task.title);
    setNewDescription(task.description || '');
    setNewPriority(task.priority);
    setNewDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingTask(null);
    setNewTitle('');
    setNewDescription('');
    setNewPriority('medium');
    setNewDueDate('');
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const start = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const end = Math.min(page * LIMIT, total);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-32 h-7 rounded-lg bg-gray-200 animate-pulse" />
            </div>
            <div className="w-28 h-9 rounded-lg bg-gray-200 animate-pulse" />
          </div>

          {/* Skeleton filter bar */}
          <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-20 h-8 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
              <div className="w-24 h-8 rounded-full bg-gray-100 animate-pulse" />
            </div>
          </div>

          {/* Skeleton task cards */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 border-l-4 border-l-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded border-2 border-gray-200 animate-pulse mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-72 bg-gray-100 rounded animate-pulse" />
                    <div className="flex items-center gap-3 mt-2">
                      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Tasks</h1>
          </div>
          <button
            onClick={() => { setEditingTask(null); setShowCreateModal(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-900 text-white rounded-lg transition-all duration-300 text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <Icon icon="mdi:plus" className="w-4 h-4" />
            New Task
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                    statusFilter === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMineOnly(!mineOnly)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                mineOnly
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mineOnly ? 'My Tasks' : 'All Tasks'}
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-100 p-12 text-center shadow-sm">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Icon icon="mdi:clipboard-check-outline" className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tasks</h3>
              <p className="text-gray-500">Create tasks to track follow-ups with students.</p>
            </div>
          ) : (
            tasks.map(task => {
              const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
              const priorityBorder = PRIORITY_BORDER[task.priority] || PRIORITY_BORDER.medium;
              const overdue = isOverdue(task.due_date, task.status);

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-300 p-4 border-l-4 ${priorityBorder} ${
                    overdue
                      ? 'bg-red-50/50 border-red-200'
                      : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status checkbox */}
                    <button
                      onClick={() =>
                        handleStatusChange(
                          task.id,
                          task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed'
                        )
                      }
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                        task.status === 'completed'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : task.status === 'in_progress'
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {task.status === 'completed' && <Icon icon="mdi:check" className="w-3 h-3" />}
                      {task.status === 'in_progress' && <Icon icon="mdi:dots-horizontal" className="w-3 h-3" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-medium ${
                          task.status === 'completed'
                            ? 'text-gray-400 line-through'
                            : 'text-gray-900'
                        }`}>
                          {task.title}
                        </h3>
                        <Icon icon={priority.icon} className={`w-4 h-4 ${priority.color}`} />
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        {task.student_name && (
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:account" className="w-3.5 h-3.5" />
                            <Link href={`/crm/students/${task.student_id}`} className="text-blue-600 hover:text-blue-900 font-semibold">
                              {task.student_name}
                            </Link>
                          </span>
                        )}
                        {task.assigned_to_name && (
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:account-arrow-right" className="w-3.5 h-3.5" />
                            {task.assigned_to_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                            <Icon icon="mdi:calendar" className="w-3.5 h-3.5" />
                            {overdue ? 'Overdue: ' : 'Due: '}
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        <span className="capitalize bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-lg text-xs font-medium">{task.source}</span>
                      </div>
                    </div>

                    {/* Edit & Delete buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Edit task"
                      >
                        <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        disabled={deletingTaskId === task.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                        title="Delete task"
                      >
                        {deletingTaskId === task.id ? (
                          <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">Showing {start}-{end} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Create/Edit Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-gray-100 w-full max-w-md">
              <div className="p-6">
                <h2 className="text-lg font-bold tracking-tight text-gray-900 mb-4">
                  {editingTask ? 'Edit Task' : 'New Task'}
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Follow up with student..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTask ? handleEdit : handleCreate}
                  disabled={creating || !newTitle.trim()}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-900 transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  {creating
                    ? (editingTask ? 'Saving...' : 'Creating...')
                    : (editingTask ? 'Save Changes' : 'Create Task')
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
