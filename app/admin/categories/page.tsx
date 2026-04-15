'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import AccessibleModal from '@/app/components/ui/AccessibleModal';
import RoleGuard from '@/app/components/RoleGuard';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  parent_id: string | null;
  order: number;
  is_active: boolean;
  course_count: number;
  children?: Category[];
}

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  parent_id: string;
  order: number;
}

const ICON_OPTIONS = [
  { value: 'material-symbols:folder', label: 'Folder' },
  { value: 'material-symbols:school', label: 'Academic' },
  { value: 'material-symbols:work', label: 'Professional' },
  { value: 'material-symbols:computer', label: 'Technology' },
  { value: 'material-symbols:groups', label: 'Leadership' },
  { value: 'material-symbols:verified', label: 'Compliance' },
  { value: 'material-symbols:calculate', label: 'Mathematics' },
  { value: 'material-symbols:science', label: 'Science' },
  { value: 'material-symbols:menu-book', label: 'Language' },
  { value: 'material-symbols:public', label: 'Social Studies' },
  { value: 'material-symbols:palette', label: 'Arts' },
  { value: 'material-symbols:fitness-center', label: 'Physical Education' },
  { value: 'material-symbols:psychology', label: 'Psychology' },
  { value: 'material-symbols:account-balance', label: 'Finance' },
  { value: 'material-symbols:gavel', label: 'Law' },
  { value: 'material-symbols:biotech', label: 'Biology' },
];

const COLOR_OPTIONS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export default function CategoriesManagementPage() {
  const { supabase } = useSupabase();
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    icon: 'material-symbols:folder',
    color: '#3B82F6',
    parent_id: '',
    order: 0
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      // Load hierarchical categories
      const response = await fetch('/api/categories?withCounts=true&includeInactive=true', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }

      // Load flat list for parent selection
      const flatResponse = await fetch('/api/categories?flat=true&includeInactive=true', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (flatResponse.ok) {
        const flatData = await flatResponse.json();
        setFlatCategories(flatData.categories || []);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (parentId?: string) => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      icon: 'material-symbols:folder',
      color: '#3B82F6',
      parent_id: parentId || '',
      order: 0
    });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon,
      color: category.color,
      parent_id: category.parent_id || '',
      order: category.order
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';

      const response = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          icon: formData.icon,
          color: formData.color,
          parent_id: formData.parent_id || null,
          order: formData.order
        })
      });

      if (response.ok) {
        setSuccess(editingCategory ? 'Category updated successfully' : 'Category created successfully');
        setShowModal(false);
        loadCategories();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save category');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/categories/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        setSuccess('Category deleted successfully');
        setDeleteConfirm(null);
        loadCategories();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete category');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (category: Category) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !category.is_active })
      });

      if (response.ok) {
        loadCategories();
      }
    } catch (err) {
      console.error('Error toggling category:', err);
    }
  };

  const renderCategory = (category: Category, depth: number = 0) => (
    <React.Fragment key={category.id}>
      <tr className={`hover:bg-gray-50 ${!category.is_active ? 'opacity-50' : ''}`}>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
            {depth > 0 && (
              <span className="text-gray-300 mr-2">└</span>
            )}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <Icon icon={category.icon} className="w-5 h-5" style={{ color: category.color }} />
            </div>
            <div>
              <p className="font-medium text-gray-900">{category.name}</p>
              <p className="text-sm text-gray-500">{category.slug}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <p className="text-sm text-gray-600 max-w-xs truncate">
            {category.description || '-'}
          </p>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {category.course_count} courses
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <button
            onClick={() => toggleActive(category)}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              category.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {category.is_active ? 'Active' : 'Inactive'}
          </button>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => openCreateModal(category.id)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Add subcategory"
              aria-label="Add subcategory"
            >
              <Icon icon="material-symbols:add" className="w-5 h-5" />
            </button>
            <button
              onClick={() => openEditModal(category)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Edit"
              aria-label="Edit"
            >
              <Icon icon="material-symbols:edit" className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDeleteConfirm(category)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete"
              aria-label="Delete"
            >
              <Icon icon="material-symbols:delete" className="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>
      {category.children?.map(child => renderCategory(child, depth + 1))}
    </React.Fragment>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading categories...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard
      roles={['admin', 'super_admin']}
      fallback={
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4 text-center py-12">
            <p className="text-red-600">Admin access required</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-normal text-slate-900 tracking-tight">Course Categories</h1>
              <p className="text-gray-600 mt-1">Organize courses into categories and subcategories</p>
            </div>
            <Button onClick={() => openCreateModal()}>
              <Icon icon="material-symbols:add" className="w-5 h-5 mr-2" />
              Add Category
            </Button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Categories Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courses
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <Icon icon="material-symbols:folder-off" className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No categories yet. Create your first category to get started.</p>
                    </td>
                  </tr>
                ) : (
                  categories.map(cat => renderCategory(cat))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AccessibleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
            <select
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">None (Top Level)</option>
              {flatCategories
                .filter(c => c.id !== editingCategory?.id)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.parent_id ? '└ ' : ''}{cat.name}
                  </option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
            <div className="grid grid-cols-8 gap-2">
              {ICON_OPTIONS.map(icon => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: icon.value })}
                  className={`p-2 rounded-lg border-2 ${
                    formData.icon === icon.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  title={icon.label}
                  aria-label={icon.label}
                >
                  <Icon icon={icon.value} className="w-5 h-5 mx-auto" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color
                      ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </AccessibleModal>

      {/* Delete Confirmation Modal */}
      <AccessibleModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Category"
        size="md"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
          {deleteConfirm && deleteConfirm.course_count > 0 && (
            <span className="block mt-2 text-amber-600">
              This category has {deleteConfirm.course_count} course(s) assigned.
              They will be unassigned from this category.
            </span>
          )}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </AccessibleModal>
    </RoleGuard>
  );
}
