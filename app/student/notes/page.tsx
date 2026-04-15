'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  StickyNote,
  Search,
  BookOpen,
  Trash2,
  Edit3,
  Plus,
  Filter,
  Tag,
  X,
} from 'lucide-react';

interface Note {
  id: string;
  lesson_id: string | null;
  course_id: string | null;
  content: string;
  highlight_color: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  lesson?: { id: string; title: string; course_id: string } | null;
  course?: { id: string; title: string } | null;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [searchQuery, tagFilter]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      let url = '/api/student/notes';
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (tagFilter) params.set('tag', tagFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setNotes(data.notes || []);
        // Extract all unique tags
        const tags = new Set<string>();
        (data.notes || []).forEach((note: Note) => {
          (note.tags || []).forEach((tag: string) => tags.add(tag));
        });
        setAllTags(Array.from(tags));
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/student/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const createNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const response = await fetch('/api/student/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNoteContent.trim(),
          tags: newNoteTags,
        }),
      });

      if (response.ok) {
        setNewNoteContent('');
        setNewNoteTags([]);
        setShowNewNote(false);
        fetchNotes();
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const updateNote = async () => {
    if (!editingNote) return;

    try {
      const response = await fetch(`/api/student/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editingNote.content,
          tags: editingNote.tags,
          highlight_color: editingNote.highlight_color,
        }),
      });

      if (response.ok) {
        setEditingNote(null);
        fetchNotes();
      }
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  };

  const addNewTag = () => {
    if (newTagInput.trim() && !newNoteTags.includes(newTagInput.trim())) {
      setNewNoteTags([...newNoteTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const removeNewTag = (tag: string) => {
    setNewNoteTags(newNoteTags.filter(t => t !== tag));
  };

  const getHighlightColor = (color: string) => {
    switch (color) {
      case 'yellow': return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-600';
      case 'green': return 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-600';
      case 'blue': return 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600';
      case 'pink': return 'bg-pink-100 border-pink-300 dark:bg-pink-900/30 dark:border-pink-600';
      case 'purple': return 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600';
      default: return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <StickyNote className="w-7 h-7 text-amber-500" />
              My Notes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              All your notes from lessons and courses
            </p>
          </div>
          <button
            onClick={() => setShowNewNote(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tag
                </label>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* New Note Form */}
        {showNewNote && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Note</h2>
              <button
                onClick={() => setShowNewNote(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Write your note here..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm mb-4"
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {newNoteTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button onClick={() => removeNewTag(tag)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewTag())}
                  placeholder="Add a tag..."
                  className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                />
                <button
                  onClick={addNewTag}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewNote(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createNote}
                disabled={!newNoteContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Note
              </button>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <StickyNote className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No notes yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery || tagFilter
                  ? 'No notes match your search criteria.'
                  : 'Start taking notes while viewing lessons to see them here.'}
              </p>
              {!showNewNote && (
                <button
                  onClick={() => setShowNewNote(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Note
                </button>
              )}
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                className={`rounded-lg border-l-4 p-4 ${getHighlightColor(note.highlight_color)} border border-gray-200 dark:border-gray-700`}
              >
                {editingNote?.id === note.id ? (
                  // Edit mode
                  <div>
                    <textarea
                      value={editingNote.content}
                      onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm mb-3"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {['yellow', 'green', 'blue', 'pink', 'purple'].map(color => (
                          <button
                            key={color}
                            onClick={() => setEditingNote({ ...editingNote, highlight_color: color })}
                            className={`w-6 h-6 rounded-full border-2 ${
                              editingNote.highlight_color === color ? 'border-gray-800 dark:border-white' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color === 'yellow' ? '#fef08a' : color === 'green' ? '#bbf7d0' : color === 'blue' ? '#bfdbfe' : color === 'pink' ? '#fbcfe8' : '#e9d5ff' }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingNote(null)}
                          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={updateNote}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap flex-1">
                        {note.content}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setEditingNote(note)}
                          className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                          title="Edit note"
                        >
                          <Edit3 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {note.lesson && (
                        <Link
                          href={`/course/${note.lesson.course_id}/lesson/${note.lesson.id}`}
                          className="inline-flex items-center gap-1 hover:text-blue-600"
                        >
                          <BookOpen className="w-3 h-3" />
                          {note.lesson.title}
                        </Link>
                      )}
                      {note.course && !note.lesson && (
                        <Link
                          href={`/course/${note.course.id}`}
                          className="inline-flex items-center gap-1 hover:text-blue-600"
                        >
                          <BookOpen className="w-3 h-3" />
                          {note.course.title}
                        </Link>
                      )}
                      {(note.tags || []).length > 0 && (
                        <div className="flex items-center gap-1">
                          {note.tags.map(tag => (
                            <span
                              key={tag}
                              onClick={() => setTagFilter(tag)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/50 dark:bg-gray-700/50 rounded cursor-pointer hover:bg-white dark:hover:bg-gray-700"
                            >
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="ml-auto">{formatDate(note.updated_at)}</span>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
