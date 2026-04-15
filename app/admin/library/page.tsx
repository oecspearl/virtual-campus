'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import RoleGuard from '@/app/components/RoleGuard';
import FileUpload, { UploadResult } from '@/app/components/file-upload/FileUpload';
import GoogleDrivePicker, { GoogleDriveFile, mimeToResourceType, getGoogleFileTypeLabel } from '@/app/components/media/GoogleDrivePicker';
import GoogleFileEmbed, { isGoogleWorkspaceUrl } from '@/app/components/media/GoogleFileEmbed';

interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  category_id: string | null;
  tags: string[];
  version: number;
  is_active: boolean;
  metadata: any;
  usage_count: number;
  created_at: string;
  library_resource_categories: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
}

interface LibCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  resource_count?: number;
  children?: LibCategory[];
}

interface ResourceFormData {
  title: string;
  description: string;
  resource_type: string;
  url: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: string;
  category_id: string;
  tags: string[];
  tagInput: string;
  metadata: any;
}

const RESOURCE_TYPES = [
  { value: 'document', label: 'Document', icon: 'material-symbols:description' },
  { value: 'video', label: 'Video', icon: 'material-symbols:videocam' },
  { value: 'link', label: 'External Link', icon: 'material-symbols:link' },
  { value: 'template', label: 'Template', icon: 'material-symbols:content-copy' },
  { value: 'scorm', label: 'SCORM Package', icon: 'material-symbols:package-2' },
  { value: 'image', label: 'Image', icon: 'material-symbols:image' },
  { value: 'audio', label: 'Audio', icon: 'material-symbols:audio-file' },
  { value: 'other', label: 'Other', icon: 'material-symbols:attachment' },
];

const EMPTY_FORM: ResourceFormData = {
  title: '',
  description: '',
  resource_type: 'document',
  url: '',
  file_url: '',
  file_name: '',
  file_size: null,
  file_type: '',
  category_id: '',
  tags: [],
  tagInput: '',
  metadata: {},
};

function getTypeIcon(type: string): string {
  return RESOURCE_TYPES.find(t => t.value === type)?.icon || 'material-symbols:attachment';
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LibraryResourcesPage() {
  const { supabase } = useSupabase();

  // Data state
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [categories, setCategories] = useState<LibCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<LibCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('true');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<LibraryResource | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'file' | 'metadata'>('details');

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: 'material-symbols:folder', color: '#3B82F6' });
  const [savingCategory, setSavingCategory] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState<LibraryResource | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Preview
  const [previewResource, setPreviewResource] = useState<LibraryResource | null>(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, [supabase]);

  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = await getToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterCategory) params.set('category_id', filterCategory);
      if (filterType) params.set('resource_type', filterType);
      if (filterActive) params.set('is_active', filterActive);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/library/resources?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch resources');
      const data = await res.json();
      setResources(data.resources || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, searchQuery, filterCategory, filterType, filterActive, page]);

  const loadCategories = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    const [hierRes, flatRes] = await Promise.all([
      fetch('/api/library/categories?withCounts=true', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/library/categories?flat=true', { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (hierRes.ok) {
      const data = await hierRes.json();
      setCategories(data.categories || []);
    }
    if (flatRes.ok) {
      const data = await flatRes.json();
      setFlatCategories(data.categories || []);
    }
  }, [getToken]);

  const loadTags = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    const res = await fetch('/api/library/tags', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setAllTags(data.tags || []);
    }
  }, [getToken]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  useEffect(() => {
    loadCategories();
    loadTags();
  }, [loadCategories, loadTags]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openCreateModal = () => {
    setEditingResource(null);
    setFormData(EMPTY_FORM);
    setActiveTab('details');
    setShowModal(true);
  };

  const openEditModal = (resource: LibraryResource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description || '',
      resource_type: resource.resource_type,
      url: resource.url || '',
      file_url: resource.file_url || '',
      file_name: resource.file_name || '',
      file_size: resource.file_size,
      file_type: resource.file_type || '',
      category_id: resource.category_id || '',
      tags: resource.tags || [],
      tagInput: '',
      metadata: resource.metadata || {},
    });
    setActiveTab('details');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = await getToken();
      if (!token) return;

      const payload = {
        title: formData.title,
        description: formData.description || null,
        resource_type: formData.resource_type,
        url: formData.url || null,
        file_url: formData.file_url || null,
        file_name: formData.file_name || null,
        file_size: formData.file_size,
        file_type: formData.file_type || null,
        category_id: formData.category_id || null,
        tags: formData.tags,
        metadata: formData.metadata,
      };

      const url = editingResource
        ? `/api/library/resources/${editingResource.id}`
        : '/api/library/resources';

      const res = await fetch(url, {
        method: editingResource ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save resource');
      }

      setSuccess(editingResource ? 'Resource updated successfully' : 'Resource created successfully');
      setShowModal(false);
      loadResources();
      loadTags();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);

    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/library/resources/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete resource');

      setSuccess('Resource deactivated successfully');
      setDeleteConfirm(null);
      loadResources();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = (result: UploadResult) => {
    setFormData(prev => ({
      ...prev,
      file_url: result.fileUrl,
      file_name: result.fileName,
      file_size: result.fileSize,
      file_type: result.fileType,
      title: prev.title || result.fileName.replace(/\.[^/.]+$/, ''),
    }));
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed], tagInput: '' }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCategory(true);

    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch('/api/library/categories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });

      if (!res.ok) throw new Error('Failed to create category');

      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '', icon: 'material-symbols:folder', color: '#3B82F6' });
      loadCategories();
      setSuccess('Category created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleActive = async (resource: LibraryResource) => {
    try {
      const token = await getToken();
      if (!token) return;

      await fetch(`/api/library/resources/${resource.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !resource.is_active }),
      });

      loadResources();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && resources.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading library...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard
      roles={['admin', 'super_admin', 'tenant_admin']}
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
              <h1 className="text-xl font-normal text-slate-900 tracking-tight">Library Resources</h1>
              <p className="text-gray-600 mt-1">Manage reusable resources that can be attached to courses</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCategoryModal(true)}>
                <Icon icon="material-symbols:folder-open" className="w-5 h-5 mr-2" />
                Add Category
              </Button>
              <Button onClick={openCreateModal}>
                <Icon icon="material-symbols:add" className="w-5 h-5 mr-2" />
                Add Resource
              </Button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <p className="text-red-800">{error}</p>
              <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
                <Icon icon="material-symbols:close" className="w-5 h-5" />
              </button>
            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Resources</p>
              <p className="text-2xl font-semibold text-gray-900">{total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Categories</p>
              <p className="text-2xl font-semibold text-gray-900">{flatCategories.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Tags</p>
              <p className="text-2xl font-semibold text-gray-900">{allTags.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Resource Types</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(resources.map(r => r.resource_type)).size}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Icon icon="material-symbols:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {flatCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {RESOURCE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={filterActive}
                onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
                <option value="">All</option>
              </select>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <Icon icon="material-symbols:grid-view" className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <Icon icon="material-symbols:view-list" className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Resources Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {resources.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Icon icon="material-symbols:library-books" className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">No resources found</p>
                  <p className="text-gray-400 mt-1">Create your first library resource to get started</p>
                </div>
              ) : (
                resources.map(resource => (
                  <div
                    key={resource.id}
                    className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${
                      !resource.is_active ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: resource.library_resource_categories
                              ? `${resource.library_resource_categories.color}20`
                              : '#F3F4F620',
                          }}
                        >
                          <Icon
                            icon={getTypeIcon(resource.resource_type)}
                            className="w-5 h-5"
                            style={{
                              color: resource.library_resource_categories?.color || '#6B7280',
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">v{resource.version}</span>
                          {resource.usage_count > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600">
                              {resource.usage_count} course{resource.usage_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                        {resource.title}
                      </h3>
                      {resource.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{resource.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                          {RESOURCE_TYPES.find(t => t.value === resource.resource_type)?.label || resource.resource_type}
                        </span>
                        {resource.library_resource_categories && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                            style={{
                              backgroundColor: `${resource.library_resource_categories.color}15`,
                              color: resource.library_resource_categories.color,
                            }}
                          >
                            {resource.library_resource_categories.name}
                          </span>
                        )}
                      </div>
                      {resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {resource.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs text-gray-400">#{tag}</span>
                          ))}
                          {resource.tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{resource.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                      {resource.file_size && (
                        <p className="text-xs text-gray-400 mt-1">{formatFileSize(resource.file_size)}</p>
                      )}
                    </div>
                    <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-end gap-1">
                      {(resource.url || resource.file_url) && (
                        <button
                          onClick={() => setPreviewResource(resource)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Preview"
                        >
                          <Icon icon="material-symbols:visibility" className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(resource)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Icon icon="material-symbols:edit" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(resource)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Icon icon="material-symbols:delete" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Resources Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {resources.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <Icon icon="material-symbols:library-books" className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No resources found</p>
                      </td>
                    </tr>
                  ) : (
                    resources.map(resource => (
                      <tr key={resource.id} className={`hover:bg-gray-50 ${!resource.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-100 mr-3 flex-shrink-0">
                              <Icon icon={getTypeIcon(resource.resource_type)} className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{resource.title}</p>
                              {resource.file_name && (
                                <p className="text-xs text-gray-400 truncate">{resource.file_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                            {RESOURCE_TYPES.find(t => t.value === resource.resource_type)?.label || resource.resource_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {resource.library_resource_categories ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                              style={{
                                backgroundColor: `${resource.library_resource_categories.color}15`,
                                color: resource.library_resource_categories.color,
                              }}
                            >
                              {resource.library_resource_categories.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-gray-600">{resource.usage_count}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-gray-600">v{resource.version}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleActive(resource); }}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              resource.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {resource.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(resource.url || resource.file_url) && (
                              <button
                                onClick={() => setPreviewResource(resource)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Preview"
                              >
                                <Icon icon="material-symbols:visibility" className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(resource)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Icon icon="material-symbols:edit" className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(resource)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Resource Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)}></div>
            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingResource ? 'Edit Resource' : 'Add Resource'}
              </h2>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                {(['details', 'file', 'metadata'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'details' ? 'Details' : tab === 'file' ? 'File / URL' : 'Metadata'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Details Tab */}
                {activeTab === 'details' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Resource title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Brief description of the resource"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type *</label>
                      <div className="grid grid-cols-4 gap-2">
                        {RESOURCE_TYPES.map(type => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, resource_type: type.value }))}
                            className={`flex flex-col items-center p-3 rounded-lg border-2 text-xs ${
                              formData.resource_type === type.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }`}
                          >
                            <Icon icon={type.icon} className="w-5 h-5 mb-1" />
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">No category</option>
                        {flatCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {formData.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 text-blue-500 hover:text-blue-700"
                            >
                              <Icon icon="material-symbols:close" className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.tagInput}
                          onChange={(e) => setFormData(prev => ({ ...prev, tagInput: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTag(formData.tagInput);
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Type a tag and press Enter"
                          list="tag-suggestions"
                        />
                        <datalist id="tag-suggestions">
                          {allTags.filter(t => !formData.tags.includes(t)).map(tag => (
                            <option key={tag} value={tag} />
                          ))}
                        </datalist>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addTag(formData.tagInput)}
                          disabled={!formData.tagInput.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* File/URL Tab */}
                {activeTab === 'file' && (
                  <>
                    {/* Google Drive Picker */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-blue-900">Import from Google Drive</h4>
                          <p className="text-xs text-blue-600 mt-0.5">Select files from Google Docs, Sheets, Slides, or Drive</p>
                        </div>
                        <GoogleDrivePicker
                          onSelect={(files: GoogleDriveFile[]) => {
                            if (files.length > 0) {
                              const file = files[0];
                              setFormData(prev => ({
                                ...prev,
                                url: file.embedUrl,
                                file_name: file.name,
                                file_type: file.mimeType,
                                file_size: file.size || null,
                                resource_type: mimeToResourceType(file.mimeType),
                                title: prev.title || file.name,
                                metadata: {
                                  ...prev.metadata,
                                  google_file_id: file.id,
                                  google_mime_type: file.mimeType,
                                  google_url: file.url,
                                  source: 'google_drive',
                                },
                              }));
                            }
                          }}
                          buttonLabel="Browse Drive"
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 bg-white text-sm text-gray-400">or enter a URL</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">External URL</label>
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/resource"
                      />
                      <p className="mt-1 text-xs text-gray-400">For external links, videos, or web resources</p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 bg-white text-sm text-gray-400">or upload a file</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">File Upload</label>
                      <FileUpload onUploaded={handleFileUpload} />
                    </div>

                    {(formData.file_url || (formData.url && formData.metadata?.source === 'google_drive')) && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Icon
                            icon={formData.metadata?.source === 'google_drive' ? 'mdi:google-drive' : 'material-symbols:check-circle'}
                            className="w-5 h-5 text-green-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-green-800">{formData.file_name}</p>
                            <p className="text-xs text-green-600">
                              {formData.metadata?.source === 'google_drive'
                                ? getGoogleFileTypeLabel(formData.metadata.google_mime_type || '')
                                : formData.file_size ? formatFileSize(formData.file_size) : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              url: '',
                              file_url: '',
                              file_name: '',
                              file_size: null,
                              file_type: '',
                              metadata: { ...prev.metadata, google_file_id: undefined, google_mime_type: undefined, google_url: undefined, source: undefined },
                            }))}
                            className="ml-auto text-green-600 hover:text-green-800"
                          >
                            <Icon icon="material-symbols:close" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Metadata Tab */}
                {activeTab === 'metadata' && (
                  <>
                    {editingResource && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Version Info</h4>
                        <p className="text-sm text-gray-600">Current version: <strong>v{editingResource.version}</strong></p>
                        <p className="text-xs text-gray-400 mt-1">Updating the file or URL will automatically create a new version</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Version Notes</label>
                      <textarea
                        value={formData.metadata.version_notes || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          metadata: { ...prev.metadata, version_notes: e.target.value },
                        }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="What changed in this version?"
                      />
                    </div>

                    {formData.resource_type === 'video' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                        <input
                          type="number"
                          value={formData.metadata.duration || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            metadata: { ...prev.metadata, duration: parseInt(e.target.value) || null },
                          }))}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {formData.resource_type === 'document' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Page Count</label>
                        <input
                          type="number"
                          value={formData.metadata.page_count || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            metadata: { ...prev.metadata, page_count: parseInt(e.target.value) || null },
                          }))}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Author / Source</label>
                      <input
                        type="text"
                        value={formData.metadata.author || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          metadata: { ...prev.metadata, author: e.target.value },
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Original author or source"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">License</label>
                      <select
                        value={formData.metadata.license || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          metadata: { ...prev.metadata, license: e.target.value },
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Not specified</option>
                        <option value="proprietary">Proprietary</option>
                        <option value="cc-by">CC BY</option>
                        <option value="cc-by-sa">CC BY-SA</option>
                        <option value="cc-by-nc">CC BY-NC</option>
                        <option value="cc-by-nc-sa">CC BY-NC-SA</option>
                        <option value="cc0">CC0 / Public Domain</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingResource ? 'Update Resource' : 'Create Resource'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowCategoryModal(false)}></div>
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add Category</h2>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={savingCategory}>
                    {savingCategory ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)}></div>
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Deactivate Resource</h2>
              <p className="text-gray-600 mb-2">
                Are you sure you want to deactivate <strong>{deleteConfirm.title}</strong>?
              </p>
              {deleteConfirm.usage_count > 0 && (
                <p className="text-amber-600 text-sm mb-4">
                  This resource is currently used in {deleteConfirm.usage_count} course(s).
                  It will remain attached but marked as inactive.
                </p>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deactivating...' : 'Deactivate'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewResource && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setPreviewResource(null)}></div>
            <div className="relative bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
              {/* Preview Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: previewResource.library_resource_categories
                        ? `${previewResource.library_resource_categories.color}20`
                        : '#F3F4F620',
                    }}
                  >
                    <Icon
                      icon={getTypeIcon(previewResource.resource_type)}
                      className="w-5 h-5"
                      style={{ color: previewResource.library_resource_categories?.color || '#6B7280' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">{previewResource.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {RESOURCE_TYPES.find(t => t.value === previewResource.resource_type)?.label}
                      </span>
                      {previewResource.library_resource_categories && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${previewResource.library_resource_categories.color}15`,
                            color: previewResource.library_resource_categories.color,
                          }}
                        >
                          {previewResource.library_resource_categories.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">v{previewResource.version}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(previewResource.url || previewResource.file_url) && (
                    <a
                      href={previewResource.url || previewResource.file_url || ''}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Open in new tab"
                    >
                      <Icon icon="material-symbols:open-in-new" className="w-5 h-5" />
                    </a>
                  )}
                  <button
                    onClick={() => { setPreviewResource(null); openEditModal(previewResource); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <Icon icon="material-symbols:edit" className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPreviewResource(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <Icon icon="material-symbols:close" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {previewResource.description && (
                  <p className="text-sm text-gray-600 mb-4">{previewResource.description}</p>
                )}

                {/* Tags */}
                {previewResource.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {previewResource.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Content Preview */}
                {(() => {
                  const previewUrl = previewResource.url || previewResource.file_url;
                  if (!previewUrl) {
                    return (
                      <div className="text-center py-12 text-gray-400">
                        <Icon icon="material-symbols:visibility-off" className="w-12 h-12 mx-auto mb-3" />
                        <p>No preview available for this resource</p>
                      </div>
                    );
                  }

                  // Google Workspace files
                  if (isGoogleWorkspaceUrl(previewUrl)) {
                    return (
                      <GoogleFileEmbed
                        url={previewUrl}
                        title={previewResource.title}
                        height="600px"
                      />
                    );
                  }

                  // Images
                  if (previewResource.resource_type === 'image' || previewResource.file_type?.startsWith('image/')) {
                    return (
                      <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt={previewResource.title}
                          className="max-w-full max-h-[500px] rounded shadow"
                        />
                      </div>
                    );
                  }

                  // Video
                  if (previewResource.resource_type === 'video' || previewResource.file_type?.startsWith('video/')) {
                    return (
                      <video
                        src={previewUrl}
                        controls
                        className="w-full max-h-[500px] rounded-lg bg-black"
                      >
                        Your browser does not support video playback.
                      </video>
                    );
                  }

                  // Audio
                  if (previewResource.resource_type === 'audio' || previewResource.file_type?.startsWith('audio/')) {
                    return (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <audio src={previewUrl} controls className="w-full">
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    );
                  }

                  // PDF
                  if (previewResource.file_type === 'application/pdf' || previewUrl.endsWith('.pdf')) {
                    return (
                      <iframe
                        src={previewUrl}
                        className="w-full h-[600px] border border-gray-200 rounded-lg"
                        title={previewResource.title}
                      />
                    );
                  }

                  // Generic embeddable URL
                  if (previewResource.resource_type === 'link' || previewUrl.startsWith('http')) {
                    return (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <iframe
                          src={previewUrl}
                          className="w-full h-[600px]"
                          title={previewResource.title}
                          loading="lazy"
                          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="text-center py-12 text-gray-400">
                      <Icon icon="material-symbols:visibility-off" className="w-12 h-12 mx-auto mb-3" />
                      <p>Preview not available for this file type</p>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Icon icon="material-symbols:open-in-new" className="w-4 h-4 mr-1" />
                        Open resource
                      </a>
                    </div>
                  );
                })()}

                {/* Metadata Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {previewResource.file_name && (
                    <div>
                      <p className="text-xs text-gray-400">File Name</p>
                      <p className="text-sm text-gray-700 truncate">{previewResource.file_name}</p>
                    </div>
                  )}
                  {previewResource.file_size && (
                    <div>
                      <p className="text-xs text-gray-400">Size</p>
                      <p className="text-sm text-gray-700">{formatFileSize(previewResource.file_size)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400">Version</p>
                    <p className="text-sm text-gray-700">v{previewResource.version}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Used in</p>
                    <p className="text-sm text-gray-700">{previewResource.usage_count} course{previewResource.usage_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
