'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';

interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  tags: string[];
  version: number;
  library_resource_categories: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
}

interface LibraryResourcePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (resourceIds: string[]) => void;
  excludeIds?: string[];
}

const RESOURCE_TYPES = [
  { value: 'document', label: 'Document', icon: 'material-symbols:description' },
  { value: 'video', label: 'Video', icon: 'material-symbols:videocam' },
  { value: 'link', label: 'Link', icon: 'material-symbols:link' },
  { value: 'template', label: 'Template', icon: 'material-symbols:content-copy' },
  { value: 'scorm', label: 'SCORM', icon: 'material-symbols:package-2' },
  { value: 'image', label: 'Image', icon: 'material-symbols:image' },
  { value: 'audio', label: 'Audio', icon: 'material-symbols:audio-file' },
  { value: 'other', label: 'Other', icon: 'material-symbols:attachment' },
];

function getTypeIcon(type: string): string {
  return RESOURCE_TYPES.find(t => t.value === type)?.icon || 'material-symbols:attachment';
}

export default function LibraryResourcePicker({ isOpen, onClose, onSelect, excludeIds = [] }: LibraryResourcePickerProps) {
  const { supabase } = useSupabase();
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, [supabase]);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const params = new URLSearchParams({ is_active: 'true', limit: '50' });
      if (searchQuery) params.set('search', searchQuery);
      if (filterType) params.set('resource_type', filterType);

      const res = await fetch(`/api/library/resources?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setResources((data.resources || []).filter((r: LibraryResource) => !excludeIds.includes(r.id)));
      }
    } catch (err) {
      console.error('Error loading resources:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken, searchQuery, filterType, excludeIds]);

  useEffect(() => {
    if (isOpen) {
      loadResources();
      setSelected(new Set());
    }
  }, [isOpen, loadResources]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onSelect(Array.from(selected));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg max-w-3xl w-full p-6 max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Select Library Resources</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <Icon icon="material-symbols:close" className="w-6 h-6" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Icon icon="material-symbols:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {RESOURCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Resource List */}
          <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Icon icon="material-symbols:search-off" className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>No resources found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {resources.map(resource => (
                  <label
                    key={resource.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
                      selected.has(resource.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(resource.id)}
                      onChange={() => toggleSelect(resource.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-100 flex-shrink-0">
                      <Icon icon={getTypeIcon(resource.resource_type)} className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{resource.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {RESOURCE_TYPES.find(t => t.value === resource.resource_type)?.label}
                        </span>
                        {resource.library_resource_categories && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${resource.library_resource_categories.color}15`,
                              color: resource.library_resource_categories.color,
                            }}
                          >
                            {resource.library_resource_categories.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">v{resource.version}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">
              {selected.size} resource{selected.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={selected.size === 0}>
                Attach Selected
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
