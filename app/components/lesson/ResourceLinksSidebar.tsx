'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';
import GoogleDrivePicker, { GoogleDriveFile, getGoogleFileTypeLabel } from '@/app/components/media/GoogleDrivePicker';

// Allowed file types for resource uploads
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': { ext: 'pdf', type: 'document', icon: '📄' },
  'application/msword': { ext: 'doc', type: 'document', icon: '📄' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', type: 'document', icon: '📄' },
  'application/rtf': { ext: 'rtf', type: 'document', icon: '📄' },
  'text/plain': { ext: 'txt', type: 'document', icon: '📄' },
  // Presentations
  'application/vnd.ms-powerpoint': { ext: 'ppt', type: 'presentation', icon: '📊' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx', type: 'presentation', icon: '📊' },
  // Spreadsheets (bonus - often needed with presentations)
  'application/vnd.ms-excel': { ext: 'xls', type: 'document', icon: '📊' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', type: 'document', icon: '📊' },
};

const ALLOWED_EXTENSIONS = Object.values(ALLOWED_FILE_TYPES).map(f => `.${f.ext}`).join(',');

interface ResourceLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  link_type?: string;
  icon?: string;
  order?: number;
  file_id?: string;
}

interface ResourceLinksSidebarProps {
  courseId?: string;
  lessonId?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function ResourceLinksSidebar({ courseId, lessonId, collapsible = false, defaultOpen = true }: ResourceLinksSidebarProps) {
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(defaultOpen);
  const [editForm, setEditForm] = useState({ title: '', url: '', description: '', link_type: 'external' });
  const [editingId, setEditingId] = useState<string | null>(null);

  // File upload state
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [maxUploadSizeMB, setMaxUploadSizeMB] = useState(10);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLinks();
    fetchUploadLimit();
  }, [courseId, lessonId]);

  const fetchUploadLimit = async () => {
    try {
      const response = await fetch('/api/admin/settings/resource-upload');
      if (response.ok) {
        const data = await response.json();
        setMaxUploadSizeMB(data.maxSizeMB || 10);
      }
    } catch (error) {
      console.error('Error fetching upload limit:', error);
      // Keep default 10MB
    }
  };

  const fetchLinks = async () => {
    try {
      setLoading(true);
      
      if (!courseId && !lessonId) {
        setLinks([]);
        return;
      }

      const params = new URLSearchParams();
      if (courseId) params.append('courseId', courseId);
      if (lessonId) params.append('lessonId', lessonId);

      const response = await fetch(`/api/resource-links?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 404 || response.status === 500) {
          // Table might not exist yet or there's a server error, just return empty array
          setLinks([]);
          return;
        }
        throw new Error('Failed to fetch resource links');
      }

      const data = await response.json();
      setLinks(data.links || []);
    } catch (error) {
      console.error('Error fetching resource links:', error);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title || !editForm.url) {
      alert('Please fill in title and URL');
      return;
    }

    if (!courseId && !lessonId) {
      alert('Either courseId or lessonId is required');
      return;
    }

    try {
      const url = editingId ? `/api/resource-links/${editingId}` : '/api/resource-links';
      const body = editingId 
        ? { ...editForm }
        : { ...editForm, courseId, lessonId };

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save resource link');
      }

      await fetchLinks();
      setIsEditing(false);
      setEditForm({ title: '', url: '', description: '', link_type: 'external' });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving resource link:', error);
      alert(error instanceof Error ? error.message : 'Failed to save resource link');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource link?')) return;

    try {
      const response = await fetch(`/api/resource-links/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete resource link');

      await fetchLinks();
    } catch (error) {
      console.error('Error deleting resource link:', error);
      alert('Failed to delete resource link');
    }
  };

  const handleEdit = (link: ResourceLink) => {
    setEditForm({
      title: link.title,
      url: link.url,
      description: link.description || '',
      link_type: link.link_type || 'external'
    });
    setEditingId(link.id);
    setIsEditing(true);
    setUploadMode('url'); // Reset to URL mode when editing
  };

  // File upload handler
  const handleFileUpload = async (file: File) => {
    setUploadError(null);

    // Validate file type
    const fileTypeInfo = ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES];
    if (!fileTypeInfo) {
      setUploadError('Invalid file type. Allowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, RTF');
      return;
    }

    // Validate file size
    const maxBytes = maxUploadSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File too large. Maximum size is ${maxUploadSizeMB}MB`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.set('file', file);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Auto-fill the form with uploaded file info
      setEditForm({
        ...editForm,
        title: editForm.title || file.name.replace(/\.[^/.]+$/, ''), // Remove extension for title
        url: data.fileUrl,
        link_type: fileTypeInfo.type === 'presentation' ? 'document' : fileTypeInfo.type
      });

      setUploadMode('url'); // Switch back to URL mode to show the uploaded URL
    } catch (error) {
      console.error('File upload error:', error);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const getLinkIcon = (link: ResourceLink) => {
    if (link.icon) {
      return link.icon;
    }

    // Default icons based on link type
    switch (link.link_type) {
      case 'document':
        return '📄';
      case 'video':
        return '🎥';
      case 'article':
        return '📰';
      case 'tool':
        return '🔧';
      default:
        return '🔗';
    }
  };

  const resourceHeader = (
    <div
      className={`px-5 py-3 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none' : ''}`}
      onClick={collapsible ? () => setIsSectionOpen(!isSectionOpen) : undefined}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Resources
        </h3>
        <div className="flex items-center gap-2">
          {!collapsible && (
            <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setEditForm({ title: '', url: '', description: '', link_type: 'external' });
                  setEditingId(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </RoleGuard>
          )}
          {collapsible && (
            <svg className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${isSectionOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
        {resourceHeader}
        {(!collapsible || isSectionOpen) && (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      {resourceHeader}
      {(!collapsible || isSectionOpen) && (
      <div className="p-4">
        {links.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-gray-500 text-sm">No resource links yet</p>
            {!isEditing && (
              <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditForm({ title: '', url: '', description: '', link_type: 'external' });
                    setEditingId(null);
                  }}
                  className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
                >
                  Add First Link
                </button>
              </RoleGuard>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="group relative flex items-start p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-teal-200"
              >
                <div className="flex-shrink-0 mr-3 text-2xl">{getLinkIcon(link)}</div>
                <div className="flex-1 min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors break-words"
                  >
                    {link.title}
                  </a>
                  {link.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-3 break-words">{link.description}</p>
                  )}
                </div>
                <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => handleEdit(link)}
                      className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </RoleGuard>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Form */}
        {isEditing && (
          <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                {editingId ? 'Edit Resource Link' : 'Add Resource Link'}
              </h4>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Resource Title"
                    required
                  />
                </div>

                {/* Upload Mode Toggle - Only show for new resources */}
                {!editingId && (
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        uploadMode === 'url'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                        </svg>
                        URL
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        uploadMode === 'file'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload
                      </span>
                    </button>
                    {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                      <button
                        type="button"
                        onClick={() => setUploadMode('google' as any)}
                        className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                          uploadMode === ('google' as any)
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.71 3.5l-1.42 2.46L2.2 12l4.09 6.04 1.42 2.46h8.58l1.42-2.46L21.8 12l-4.09-6.04-1.42-2.46H7.71zm.79 1h7l1.2 2.08L20.2 12l-3.5 5.42L15.5 19.5h-7l-1.2-2.08L3.8 12l3.5-5.42L8.5 4.5z"/>
                          </svg>
                          Drive
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* URL Input */}
                {(uploadMode === 'url' || editingId) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={editForm.url}
                      onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                )}

                {/* File Upload Dropzone */}
                {uploadMode === 'file' && !editingId && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Upload File <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        dragOver
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleFileDrop}
                      onClick={() => !uploading && fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_EXTENSIONS}
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading ? (
                        <div className="flex flex-col items-center">
                          <LoadingIndicator variant="dots" size="sm" text="Uploading..." />
                        </div>
                      ) : (
                        <>
                          <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-xs text-gray-600 mb-1">
                            Drop file here or <span className="text-teal-600 font-medium">browse</span>
                          </p>
                          <p className="text-xs text-gray-400">
                            PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX (Max {maxUploadSizeMB}MB)
                          </p>
                        </>
                      )}
                    </div>
                    {uploadError && (
                      <p className="mt-1 text-xs text-red-600">{uploadError}</p>
                    )}
                    {editForm.url && uploadMode === 'file' && (
                      <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        File uploaded successfully
                      </p>
                    )}
                  </div>
                )}
                {/* Google Drive Picker */}
                {uploadMode === ('google' as any) && !editingId && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Select from Google Drive
                    </label>
                    <GoogleDrivePicker
                      onSelect={(files: GoogleDriveFile[]) => {
                        if (files.length > 0) {
                          const file = files[0];
                          setEditForm(prev => ({
                            ...prev,
                            url: file.embedUrl,
                            title: prev.title || file.name,
                            link_type: 'document',
                          }));
                        }
                      }}
                      buttonLabel="Browse Google Drive"
                      buttonVariant="outline"
                      className="w-full"
                    />
                    {editForm.url && uploadMode === ('google' as any) && (
                      <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Google Drive file selected
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Brief description of the resource"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={editForm.link_type}
                    onChange={(e) => setEditForm({ ...editForm, link_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="external">External Link</option>
                    <option value="document">Document</option>
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="tool">Tool</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                  >
                    {editingId ? 'Update' : 'Add Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({ title: '', url: '', description: '', link_type: 'external' });
                      setEditingId(null);
                      setUploadMode('url');
                      setUploadError(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </RoleGuard>
        )}
      </div>
      )}
    </div>
  );
}

