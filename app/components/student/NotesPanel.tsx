'use client';

import { useState, useEffect, useRef } from 'react';
import {
  StickyNote,
  Plus,
  Save,
  Trash2,
  X,
  Tag,
  ChevronRight,
  Search,
} from 'lucide-react';

interface Note {
  id: string;
  content: string;
  highlight_color: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  lesson?: {
    id: string;
    title: string;
    course_id: string;
  };
}

interface NotesPanelProps {
  lessonId?: string;
  courseId?: string;
  isOpen: boolean;
  onClose: () => void;
  onNoteSelect?: (note: Note) => void;
}

const COLORS = [
  { name: 'yellow', class: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300' },
  { name: 'green', class: 'bg-green-100 dark:bg-green-900/30 border-green-300' },
  { name: 'blue', class: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300' },
  { name: 'pink', class: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300' },
  { name: 'purple', class: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300' },
];

export default function NotesPanel({
  lessonId,
  courseId,
  isOpen,
  onClose,
  onNoteSelect,
}: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState({
    content: '',
    highlight_color: 'yellow',
    tags: [] as string[],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewNote, setShowNewNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen, lessonId, courseId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      let url = '/api/student/notes';
      const params = new URLSearchParams();
      if (lessonId) params.set('lesson_id', lessonId);
      if (courseId) params.set('course_id', courseId);
      if (searchQuery) params.set('search', searchQuery);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!newNote.content.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/student/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          course_id: courseId,
          content: newNote.content,
          highlight_color: newNote.highlight_color,
          tags: newNote.tags,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(prev => [data.note, ...prev]);
        setNewNote({ content: '', highlight_color: 'yellow', tags: [] });
        setShowNewNote(false);
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateNote = async () => {
    if (!editingNote) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/student/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editingNote.content,
          highlight_color: editingNote.highlight_color,
          tags: editingNote.tags,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(prev =>
          prev.map(n => (n.id === editingNote.id ? data.note : n))
        );
        setEditingNote(null);
      }
    } catch (err) {
      console.error('Failed to update note:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      const response = await fetch(`/api/student/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        if (editingNote?.id === noteId) {
          setEditingNote(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const getColorClass = (color: string) => {
    return COLORS.find(c => c.name === color)?.class || COLORS[0].class;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-yellow-500" />
          Notes
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewNote(true)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchNotes()}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* New note form */}
      {showNewNote && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <textarea
            ref={textareaRef}
            value={newNote.content}
            onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Write your note..."
            className={`w-full p-3 rounded-lg border-2 resize-none ${getColorClass(newNote.highlight_color)} text-gray-900 dark:text-white`}
            rows={4}
            autoFocus
          />

          {/* Color picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Color:</span>
            {COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => setNewNote(prev => ({ ...prev, highlight_color: color.name }))}
                className={`w-6 h-6 rounded-full border-2 ${color.class} ${
                  newNote.highlight_color === color.name ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                }`}
              />
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowNewNote(false);
                setNewNote({ content: '', highlight_color: 'yellow', tags: [] });
              }}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              onClick={saveNote}
              disabled={saving || !newNote.content.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No notes yet</p>
            <p className="text-sm mt-1">Click + to create your first note</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`group relative p-3 rounded-lg border-2 ${getColorClass(note.highlight_color)}`}
            >
              {editingNote?.id === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editingNote.content}
                    onChange={(e) =>
                      setEditingNote(prev => prev ? { ...prev, content: e.target.value } : null)
                    }
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingNote(null)}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateNote}
                      disabled={saving}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p
                    className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap cursor-pointer"
                    onClick={() => {
                      onNoteSelect?.(note);
                      setEditingNote(note);
                    }}
                  >
                    {note.content}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {note.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingNote(note)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {note.lesson && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {note.lesson.title}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </p>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
