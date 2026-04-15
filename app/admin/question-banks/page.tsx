'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import Link from 'next/link';

interface QuestionBank {
  id: string;
  name: string;
  description?: string;
  access_level: 'private' | 'shared' | 'public';
  subject_area?: string;
  grade_level?: string;
  tags: string[];
  question_count: number;
  usage_count: number;
  created_by: string;
  created_at: string;
}

export default function QuestionBanksPage() {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    access_level: 'private' as 'private' | 'shared' | 'public',
    subject_area: '',
    grade_level: '',
    tags: '',
  });

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/question-banks');
      if (response.ok) {
        const data = await response.json();
        setBanks(data);
      }
    } catch (error) {
      console.error('Failed to load question banks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/question-banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        }),
      });

      if (response.ok) {
        await loadBanks();
        setShowAddForm(false);
        setFormData({
          name: '',
          description: '',
          access_level: 'private',
          subject_area: '',
          grade_level: '',
          tags: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create question bank');
      }
    } catch (error) {
      console.error('Failed to create question bank:', error);
      alert('Failed to create question bank');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">Question Banks</h1>
            <p className="mt-2 text-sm text-gray-600">
              Shared repositories of questions that can be reused across courses
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
            Create Question Bank
          </Button>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Question Bank</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Level *
                </label>
                <select
                  value={formData.access_level}
                  onChange={(e) => setFormData({ ...formData, access_level: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="private">Private</option>
                  <option value="shared">Shared</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Area
                </label>
                <Input
                  type="text"
                  value={formData.subject_area}
                  onChange={(e) => setFormData({ ...formData, subject_area: e.target.value })}
                  placeholder="e.g., Mathematics, Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade Level
                </label>
                <Input
                  type="text"
                  value={formData.grade_level}
                  onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                  placeholder="e.g., Undergraduate, High School"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <Input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., algebra, calculus, trigonometry"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Create Bank
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    name: '',
                    description: '',
                    access_level: 'private',
                    subject_area: '',
                    grade_level: '',
                    tags: '',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banks.map((bank) => (
            <Link
              key={bank.id}
              href={`/admin/question-banks/${bank.id}`}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{bank.name}</h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    bank.access_level === 'public'
                      ? 'bg-green-100 text-green-800'
                      : bank.access_level === 'shared'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {bank.access_level}
                </span>
              </div>
              
              {bank.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{bank.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Icon icon="material-symbols:quiz" className="w-4 h-4" />
                  <span>{bank.question_count} questions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Icon icon="material-symbols:trending-up" className="w-4 h-4" />
                  <span>{bank.usage_count} uses</span>
                </div>
              </div>

              {bank.subject_area && (
                <div className="text-xs text-gray-500 mb-2">
                  <Icon icon="material-symbols:subject" className="w-3 h-3 inline mr-1" />
                  {bank.subject_area}
                </div>
              )}

              {bank.tags && bank.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {bank.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {bank.tags.length > 3 && (
                    <span className="px-2 py-1 text-xs text-gray-500">
                      +{bank.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>View Questions →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && banks.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Icon icon="material-symbols:quiz" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Question Banks Yet</h3>
          <p className="text-gray-600 mb-6">Create your first question bank to start sharing questions across courses.</p>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
            Create Question Bank
          </Button>
        </div>
      )}
    </div>
  );
}

