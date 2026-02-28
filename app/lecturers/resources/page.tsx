'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { hasRole } from '@/lib/rbac';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/Button';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  subject_area: string | null;
  grade_level: string | null;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_by_user: {
    id: string;
    name: string;
    email: string;
  };
  download_count: number;
  average_rating: number;
  rating_count: number;
  tags: string[] | null;
  created_at: string;
}

const RESOURCE_TYPES = [
  { value: 'lesson-plan', label: 'Lesson Plan', icon: 'mdi:book-open-page-variant' },
  { value: 'worksheet', label: 'Worksheet', icon: 'mdi:file-document' },
  { value: 'presentation', label: 'Presentation', icon: 'mdi:presentation' },
  { value: 'assessment', label: 'Assessment', icon: 'mdi:clipboard-check' },
  { value: 'template', label: 'Template', icon: 'mdi:file-outline' },
  { value: 'other', label: 'Other', icon: 'mdi:file' },
];

export default function LecturerResourcesPage() {
  const { user, supabase } = useSupabase();
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [filters, setFilters] = useState({
    resource_type: '',
    subject_area: '',
    grade_level: '',
    search: '',
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/auth/profile', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
              const profile = await res.json();
              setUserRole(profile?.role || user.user_metadata?.role || 'student');
              setRoleLoading(false);
              return;
            }
          }
          // Fallback to user_metadata
          setUserRole(user.user_metadata?.role || 'student');
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(user.user_metadata?.role || 'student');
        }
      }
      setRoleLoading(false);
    };

    fetchUserRole();
  }, [user, supabase]);

  useEffect(() => {
    if (roleLoading) return;
    
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (userRole && !hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      router.push('/dashboard');
      return;
    }

    if (userRole && hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      fetchResources();
    }
  }, [user, userRole, roleLoading, filters, sortBy, sortOrder, pagination.offset]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.resource_type) params.append('resource_type', filters.resource_type);
      if (filters.subject_area) params.append('subject_area', filters.subject_area);
      if (filters.grade_level) params.append('grade_level', filters.grade_level);
      if (filters.search) params.append('search', filters.search);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/lecturers/resources?${params}`);
      if (!response.ok) throw new Error('Failed to fetch resources');
      const data = await response.json();
      setResources(data.resources || []);
      setPagination(data.pagination || pagination);
    } catch (err: any) {
      console.error('Error fetching resources:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resourceId: string, fileUrl: string) => {
    try {
      // Record download
      await fetch(`/api/lecturers/resources/${resourceId}/download`, {
        method: 'POST',
      });

      // Open download link
      window.open(fileUrl, '_blank');
      fetchResources(); // Refresh to update download count
    } catch (err) {
      console.error('Error downloading:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number, ratingCount: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Icon
            key={i}
            icon={
              i < fullStars
                ? 'mdi:star'
                : i === fullStars && hasHalfStar
                ? 'mdi:star-half-full'
                : 'mdi:star-outline'
            }
            className={`text-sm ${
              i < fullStars || (i === fullStars && hasHalfStar)
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">
          {rating.toFixed(1)} ({ratingCount} {ratingCount === 1 ? 'review' : 'reviews'})
        </span>
      </div>
    );
  };

  if (roleLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (userRole && !hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Resource Library
              </h1>
              <p className="text-gray-600">
                Share and discover teaching materials with fellow lecturers
              </p>
            </div>
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
            >
              <Icon icon="mdi:upload" className="mr-2" />
              Upload Resource
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                />
              </div>
              <div>
                <select
                  value={filters.resource_type}
                  onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                >
                  <option value="">All Types</option>
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                >
                  <option value="created_at">Newest</option>
                  <option value="download_count">Most Downloaded</option>
                  <option value="average_rating">Highest Rated</option>
                </select>
              </div>
              <div>
                <Button
                  onClick={() => {
                    setFilters({ resource_type: '', subject_area: '', grade_level: '', search: '' });
                    setSortBy('created_at');
                    setSortOrder('desc');
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            {error}
          </div>
        ) : resources.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Icon icon="mdi:folder-open-outline" className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No resources found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or upload the first resource!</p>
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
            >
              Upload Resource
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => {
                const resourceType = RESOURCE_TYPES.find((t) => t.value === resource.resource_type);
                return (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Icon
                            icon={resourceType?.icon || 'mdi:file'}
                            className="text-2xl text-[#0066CC]"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase font-medium">
                            {resourceType?.label || 'Resource'}
                          </div>
                          {resource.subject_area && (
                            <div className="text-xs text-gray-400">{resource.subject_area}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <h3
                      className="text-lg font-semibold text-gray-900 mb-2 cursor-pointer hover:text-[#0066CC]"
                      onClick={() => router.push(`/lecturers/resources/${resource.id}`)}
                    >
                      {resource.title}
                    </h3>

                    {resource.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {resource.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {resource.tags?.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{resource.uploaded_by_user?.name || 'Unknown'}</span>
                      <span>{formatDate(resource.created_at)}</span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      {renderStars(resource.average_rating || 0, resource.rating_count || 0)}
                      <div className="text-sm text-gray-500">
                        <Icon icon="mdi:download" className="inline mr-1" />
                        {resource.download_count}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownload(resource.id, resource.file_url)}
                        className="flex-1 bg-[#0066CC] hover:bg-[#0052A3] text-white text-sm"
                      >
                        <Icon icon="mdi:download" className="mr-1" />
                        Download
                      </Button>
                      <Button
                        onClick={() => router.push(`/lecturers/resources/${resource.id}`)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
                      >
                        View Details
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={() =>
                    setPagination({ ...pagination, offset: pagination.offset + pagination.limit })
                  }
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <ResourceUploadModal
            onClose={() => {
              setShowUploadModal(false);
              fetchResources();
            }}
          />
        )}
      </div>
    </div>
  );
}

// Resource Upload Modal Component
function ResourceUploadModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'lesson-plan',
    subject_area: '',
    grade_level: '',
    tags: '',
    license_type: 'oecs-internal',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !formData.title) {
      alert('Please select a file and enter a title');
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('resource_type', formData.resource_type);
      uploadFormData.append('subject_area', formData.subject_area);
      uploadFormData.append('grade_level', formData.grade_level);
      uploadFormData.append('tags', formData.tags);
      uploadFormData.append('license_type', formData.license_type);

      const response = await fetch('/api/lecturers/resources', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload resource');
      }

      onClose();
    } catch (err: any) {
      console.error('Error uploading resource:', err);
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upload Resource</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <Icon icon="mdi:close" className="text-2xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File *
            </label>
            <input
              type="file"
              required
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
            />
            {file && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              placeholder="Enter resource title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              placeholder="Describe the resource..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Type *
              </label>
              <select
                required
                value={formData.resource_type}
                onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              >
                {RESOURCE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Area
              </label>
              <input
                type="text"
                value={formData.subject_area}
                onChange={(e) => setFormData({ ...formData, subject_area: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                placeholder="e.g., Mathematics"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              placeholder="e.g., algebra, worksheet, grade-9"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0066CC] hover:bg-[#0052A3] text-white"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Resource'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

