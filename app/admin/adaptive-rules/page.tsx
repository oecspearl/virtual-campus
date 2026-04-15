'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import AccessibleModal from '@/app/components/ui/AccessibleModal';

interface AdaptiveRule {
  id: string;
  quiz_id: string;
  condition_type: string;
  condition_value: {
    threshold?: number;
    topics?: string[];
    max_time?: number;
  };
  action_type: string;
  action_target: string | null;
  priority: number;
  created_at: string;
  quiz?: { title: string };
  target_lesson?: { title: string };
}

interface Quiz {
  id: string;
  title: string;
  course_id: string;
}

interface Lesson {
  id: string;
  title: string;
  course_id: string;
}

const CONDITION_TYPES = [
  { value: 'score_below', label: 'Score Below Threshold', icon: 'material-symbols:trending-down' },
  { value: 'score_above', label: 'Score Above Threshold', icon: 'material-symbols:trending-up' },
  { value: 'topic_weak', label: 'Weak in Topics', icon: 'material-symbols:psychology' },
  { value: 'time_exceeded', label: 'Time Limit Exceeded', icon: 'material-symbols:timer-off' },
];

const ACTION_TYPES = [
  { value: 'recommend_lesson', label: 'Recommend Lesson', icon: 'material-symbols:school' },
  { value: 'recommend_resource', label: 'Recommend Resource', icon: 'material-symbols:library-books' },
  { value: 'recommend_review', label: 'Recommend Review', icon: 'material-symbols:replay' },
  { value: 'send_notification', label: 'Send Notification', icon: 'material-symbols:notifications' },
];

export default function AdaptiveRulesPage() {
  const { supabase, user } = useSupabase();
  const [rules, setRules] = useState<AdaptiveRule[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AdaptiveRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    quiz_id: '',
    condition_type: 'score_below',
    threshold: 70,
    topics: '',
    max_time: 3600,
    action_type: 'recommend_lesson',
    action_target: '',
    priority: 0,
  });

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (userRole && isAuthorized) {
      fetchData();
    }
  }, [userRole]);

  const isAuthorized = userRole && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userRole);

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const res = await fetch('/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const profile = await res.json();
          setUserRole(profile?.role || 'student');
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch rules
      const rulesRes = await fetch('/api/adaptive/rules', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData.rules || []);
      }

      // Fetch quizzes for dropdown
      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('id, title, course_id')
        .order('title');
      setQuizzes(quizzesData || []);

      // Fetch lessons for dropdown
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, course_id')
        .eq('published', true)
        .order('title');
      setLessons(lessonsData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRule(null);
    setFormData({
      quiz_id: '',
      condition_type: 'score_below',
      threshold: 70,
      topics: '',
      max_time: 3600,
      action_type: 'recommend_lesson',
      action_target: '',
      priority: 0,
    });
    setShowCreateModal(true);
  };

  const handleEdit = (rule: AdaptiveRule) => {
    setEditingRule(rule);
    setFormData({
      quiz_id: rule.quiz_id,
      condition_type: rule.condition_type,
      threshold: rule.condition_value?.threshold || 70,
      topics: rule.condition_value?.topics?.join(', ') || '',
      max_time: rule.condition_value?.max_time || 3600,
      action_type: rule.action_type,
      action_target: rule.action_target || '',
      priority: rule.priority,
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.quiz_id) {
      setError('Please select a quiz');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Build condition value based on type
      let condition_value: any = {};
      if (formData.condition_type === 'score_below' || formData.condition_type === 'score_above') {
        condition_value = { threshold: formData.threshold };
      } else if (formData.condition_type === 'topic_weak') {
        condition_value = {
          threshold: formData.threshold,
          topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        };
      } else if (formData.condition_type === 'time_exceeded') {
        condition_value = { max_time: formData.max_time };
      }

      const payload = {
        quiz_id: formData.quiz_id,
        condition_type: formData.condition_type,
        condition_value,
        action_type: formData.action_type,
        action_target: formData.action_target || null,
        priority: formData.priority,
      };

      const res = await fetch('/api/adaptive/rules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save rule');
      }

      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/adaptive/rules?id=${ruleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== ruleId));
      }
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const getConditionLabel = (type: string) => {
    return CONDITION_TYPES.find(c => c.value === type)?.label || type;
  };

  const getActionLabel = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type)?.label || type;
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Icon icon="material-symbols:login" className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800">Please sign in</h2>
        </div>
      </div>
    );
  }

  if (userRole && !isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <Icon icon="material-symbols:lock" className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
          <p className="text-red-700">You don't have permission to manage adaptive rules.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            <Icon icon="material-symbols:arrow-back" className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Adaptive Learning Rules</h1>
        </div>
        <p className="text-gray-600">Configure rules that generate personalized recommendations based on quiz performance</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Icon icon="material-symbols:psychology" className="w-6 h-6 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">How Adaptive Rules Work</h3>
            <p className="text-sm text-blue-700 mt-1">
              Rules are evaluated automatically when students complete quizzes. If conditions are met,
              personalized recommendations are generated to help students improve.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Icon icon="material-symbols:add" className="w-5 h-5" />
          Create Rule
        </button>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Icon icon="material-symbols:psychology-outline" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No adaptive rules yet</h3>
          <p className="text-gray-500 mb-4">Create rules to generate personalized learning recommendations</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Rule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map(rule => (
            <div
              key={rule.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                      Priority: {rule.priority}
                    </span>
                    <span className="text-sm text-gray-500">
                      Quiz: {rule.quiz?.title || 'Unknown'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Icon
                        icon={CONDITION_TYPES.find(c => c.value === rule.condition_type)?.icon || 'material-symbols:help'}
                        className="w-5 h-5 text-orange-500"
                      />
                      <span className="font-medium">{getConditionLabel(rule.condition_type)}</span>
                      {rule.condition_value?.threshold && (
                        <span className="text-gray-500">({rule.condition_value.threshold}%)</span>
                      )}
                    </div>

                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 text-gray-400" />

                    <div className="flex items-center gap-2">
                      <Icon
                        icon={ACTION_TYPES.find(a => a.value === rule.action_type)?.icon || 'material-symbols:help'}
                        className="w-5 h-5 text-green-500"
                      />
                      <span className="font-medium">{getActionLabel(rule.action_type)}</span>
                      {rule.target_lesson && (
                        <span className="text-gray-500">({rule.target_lesson.title})</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit rule"
                  >
                    <Icon icon="material-symbols:edit" className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete rule"
                  >
                    <Icon icon="material-symbols:delete" className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AccessibleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingRule ? 'Edit Rule' : 'Create Adaptive Rule'}
        size="lg"
      >
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Quiz Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quiz</label>
                <select
                  value={formData.quiz_id}
                  onChange={e => setFormData({ ...formData, quiz_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Select a quiz...</option>
                  {quizzes.map(quiz => (
                    <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                  ))}
                </select>
              </div>

              {/* Condition Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={formData.condition_type}
                  onChange={e => setFormData({ ...formData, condition_type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {CONDITION_TYPES.map(ct => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
              </div>

              {/* Threshold (for score conditions) */}
              {(formData.condition_type === 'score_below' || formData.condition_type === 'score_above' || formData.condition_type === 'topic_weak') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.threshold}
                    onChange={e => setFormData({ ...formData, threshold: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              )}

              {/* Topics (for topic_weak condition) */}
              {formData.condition_type === 'topic_weak' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topics (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.topics}
                    onChange={e => setFormData({ ...formData, topics: e.target.value })}
                    placeholder="e.g., algebra, geometry"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              )}

              {/* Max Time (for time_exceeded condition) */}
              {formData.condition_type === 'time_exceeded' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Time (seconds)
                  </label>
                  <input
                    type="number"
                    min="60"
                    value={formData.max_time}
                    onChange={e => setFormData({ ...formData, max_time: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              )}

              {/* Action Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={formData.action_type}
                  onChange={e => setFormData({ ...formData, action_type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {ACTION_TYPES.map(at => (
                    <option key={at.value} value={at.value}>{at.label}</option>
                  ))}
                </select>
              </div>

              {/* Target Lesson (for recommend_lesson action) */}
              {formData.action_type === 'recommend_lesson' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Lesson
                  </label>
                  <select
                    value={formData.action_target}
                    onChange={e => setFormData({ ...formData, action_target: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select a lesson...</option>
                    {lessons.map(lesson => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (higher = evaluated first)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
      </AccessibleModal>
    </div>
  );
}
