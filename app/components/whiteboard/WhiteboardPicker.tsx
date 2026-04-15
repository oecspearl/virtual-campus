'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Layout, Star, Clock } from 'lucide-react';

interface WhiteboardPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (whiteboard: any) => void;
  onCreateNew?: (title: string) => void;
  courseId?: string;
}

export default function WhiteboardPicker({
  isOpen,
  onClose,
  onSelect,
  onCreateNew,
  courseId,
}: WhiteboardPickerProps) {
  const [whiteboards, setWhiteboards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'mine' | 'templates' | 'course'>('mine');
  const [newTitle, setNewTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchWhiteboards();
    }
  }, [isOpen, filter, search]);

  const fetchWhiteboards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter });
      if (search) params.set('search', search);
      if (courseId && filter === 'course') params.set('course_id', courseId);

      const res = await fetch(`/api/whiteboards?${params}`);
      if (res.ok) {
        const data = await res.json();
        setWhiteboards(data.whiteboards || []);
      }
    } catch (error) {
      console.error('Error fetching whiteboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    if (newTitle.trim()) {
      onCreateNew?.(newTitle.trim());
      setNewTitle('');
      setShowCreate(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-sm w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Select Whiteboard</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and filters */}
        <div className="px-4 py-3 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search boards..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-1.5">
            {[
              { key: 'mine', label: 'My Boards', icon: Layout },
              { key: 'templates', label: 'Templates', icon: Star },
              ...(courseId ? [{ key: 'course', label: 'Course', icon: Clock }] : []),
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  filter === key
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Board list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Create new option */}
          {onCreateNew && (
            <div className="border border-dashed border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
              {showCreate ? (
                <div className="p-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                    placeholder="Board title..."
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateNew}
                    disabled={!newTitle.trim()}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-2 p-3 text-sm text-gray-600 hover:text-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  Create New Board
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-1.5">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500" style={{animation:`pDot 1.4s ease-in-out ${i*0.16}s infinite`}} />)}<style>{`@keyframes pDot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style></div>
            </div>
          ) : whiteboards.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No whiteboards found
            </div>
          ) : (
            whiteboards.map((wb) => (
              <button
                key={wb.id}
                onClick={() => onSelect(wb)}
                className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left"
              >
                {/* Thumbnail placeholder */}
                <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  {wb.thumbnail_url ? (
                    <img src={wb.thumbnail_url} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <Layout className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{wb.title}</span>
                    {wb.is_template && (
                      <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                        Template
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(wb.updated_at).toLocaleDateString()}
                    {wb.description && ` — ${wb.description}`}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
