'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/app/components/RoleGuard';
import { Layout, Plus, Search, Star, Archive, Trash2, Copy, MoreVertical, ExternalLink } from 'lucide-react';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

interface WhiteboardItem {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  is_template: boolean;
  archived: boolean;
  visibility: string;
  collaboration: string;
  course_id?: string;
  updated_at: string;
  created_at: string;
  creator?: { id: string; name: string; email: string };
}

export default function BoardLibraryPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<WhiteboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'mine' | 'templates' | 'archived'>('mine');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchBoards();
  }, [filter, search]);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter });
      if (search) params.set('search', search);
      const res = await fetch(`/api/whiteboards?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBoards(data.whiteboards || []);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/whiteboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Board' }),
      });
      if (res.ok) {
        const board = await res.json();
        router.push(`/boards/${board.id}`);
      }
    } catch (error) {
      console.error('Error creating board:', error);
    } finally {
      setCreating(false);
    }
  };

  const duplicateBoard = async (boardId: string) => {
    try {
      const res = await fetch(`/api/whiteboards/${boardId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        fetchBoards();
      }
    } catch (error) {
      console.error('Error duplicating board:', error);
    }
    setMenuOpen(null);
  };

  const toggleArchive = async (board: WhiteboardItem) => {
    try {
      await fetch(`/api/whiteboards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !board.archived }),
      });
      fetchBoards();
    } catch (error) {
      console.error('Error archiving board:', error);
    }
    setMenuOpen(null);
  };

  const toggleTemplate = async (board: WhiteboardItem) => {
    try {
      await fetch(`/api/whiteboards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_template: !board.is_template }),
      });
      fetchBoards();
    } catch (error) {
      console.error('Error toggling template:', error);
    }
    setMenuOpen(null);
  };

  const deleteBoard = async (board: WhiteboardItem) => {
    if (!confirm(`Delete "${board.title}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/whiteboards/${board.id}`, { method: 'DELETE' });
      fetchBoards();
    } catch (error) {
      console.error('Error deleting board:', error);
    }
    setMenuOpen(null);
  };

  return (
    <RoleGuard roles={['instructor', 'admin', 'super_admin', 'tenant_admin', 'curriculum_designer']}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Whiteboards</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage collaborative boards for your courses and sessions
            </p>
          </div>
          <button
            onClick={createBoard}
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Creating...' : 'New Board'}
          </button>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
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
            {([
              { key: 'mine', label: 'My Boards', icon: Layout },
              { key: 'templates', label: 'Templates', icon: Star },
              { key: 'archived', label: 'Archived', icon: Archive },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
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

        {/* Board Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingIndicator variant="blocks" text="Loading boards..." />
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-16">
            <Layout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-500 font-medium">No boards found</h3>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'mine' ? 'Create your first whiteboard to get started.' : `No ${filter} boards yet.`}
            </p>
            {filter === 'mine' && (
              <button
                onClick={createBoard}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Create Board
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all"
              >
                {/* Thumbnail */}
                <div
                  onClick={() => router.push(`/boards/${board.id}`)}
                  className="h-32 bg-gray-50 flex items-center justify-center cursor-pointer relative"
                >
                  {board.thumbnail_url ? (
                    <img src={board.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Layout className="w-10 h-10 text-gray-300" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{board.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        {board.is_template && (
                          <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">Template</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(board.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === board.id ? null : board.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpen === board.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-6 z-20 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                            <button
                              onClick={() => duplicateBoard(board.id)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </button>
                            <button
                              onClick={() => toggleTemplate(board)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <Star className="w-3.5 h-3.5" />
                              {board.is_template ? 'Remove Template' : 'Make Template'}
                            </button>
                            <button
                              onClick={() => toggleArchive(board)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              {board.archived ? 'Unarchive' : 'Archive'}
                            </button>
                            <hr className="my-1 border-gray-100" />
                            <button
                              onClick={() => deleteBoard(board)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
