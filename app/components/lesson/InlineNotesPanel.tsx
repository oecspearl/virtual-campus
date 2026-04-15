'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * Inline Notes panel — designed to render inside a sidebar/rail.
 * Unlike the student/NotesPanel (fixed overlay), this fills its parent container.
 */

interface Note {
  id: string;
  content: string;
  highlight_color: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface InlineNotesPanelProps {
  lessonId: string;
  courseId?: string;
}

const COLORS = [
  { name: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-400' },
  { name: 'green', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-400' },
  { name: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400' },
  { name: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', dot: 'bg-pink-400' },
  { name: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-400' },
];

export default function InlineNotesPanel({ lessonId, courseId }: InlineNotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState('yellow');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchNotes();
  }, [lessonId, courseId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (lessonId) params.set('lesson_id', lessonId);
      if (courseId) params.set('course_id', courseId);
      const res = await fetch(`/api/student/notes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!newContent.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/student/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          course_id: courseId,
          content: newContent.trim(),
          highlight_color: newColor,
          tags: [],
        }),
      });
      if (res.ok) {
        setNewContent('');
        fetchNotes();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const updateNote = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      await fetch(`/api/student/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      setEditingId(null);
      fetchNotes();
    } catch {
      // silent
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await fetch(`/api/student/notes/${id}`, { method: 'DELETE' });
      fetchNotes();
    } catch {
      // silent
    }
  };

  const getColorClasses = (color: string) => {
    return COLORS.find(c => c.name === color) || COLORS[0];
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* New note input */}
      <div className="flex-shrink-0 p-3 border-b border-gray-100">
        <textarea
          ref={textareaRef}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12px] resize-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            {COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => setNewColor(c.name)}
                className={`w-5 h-5 rounded-full ${c.dot} cursor-pointer transition-transform ${newColor === c.name ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
              />
            ))}
          </div>
          <button
            onClick={saveNote}
            disabled={!newContent.trim() || saving}
            className="px-3 py-1 text-[11px] font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mx-auto mb-2" />
            <p className="text-[11px] text-gray-400">Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-6">
            <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="text-[11px] text-gray-400">No notes yet</p>
            <p className="text-[10px] text-gray-300 mt-0.5">Add your first note above</p>
          </div>
        ) : (
          notes.map(note => {
            const colors = getColorClasses(note.highlight_color);
            const isEditing = editingId === note.id;

            return (
              <div key={note.id} className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}>
                {isEditing ? (
                  <div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-[12px] resize-none focus:ring-1 focus:ring-purple-500 outline-none bg-white"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5 mt-1.5">
                      <button onClick={() => setEditingId(null)} className="px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-700 cursor-pointer">Cancel</button>
                      <button onClick={() => updateNote(note.id)} className="px-2 py-0.5 text-[10px] text-white bg-purple-600 rounded cursor-pointer">Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-400">{formatDate(note.created_at)}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                          className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                          title="Edit"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                          title="Delete"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
