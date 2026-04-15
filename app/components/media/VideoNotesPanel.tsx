'use client';

import React from 'react';
import { StickyNote, Plus, Trash2, Clock, Send, MessageCircleQuestion } from 'lucide-react';

interface VideoNote {
  id: string;
  content: string;
  content_position: number | null; // timestamp in seconds
  highlight_color: string;
  tags: string[];
  created_at: string;
}

interface VideoNotesPanelProps {
  lessonId: string;
  courseId?: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoNotesPanel({ lessonId, courseId, currentTime, onSeek }: VideoNotesPanelProps) {
  const [notes, setNotes] = React.useState<VideoNote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newContent, setNewContent] = React.useState('');
  const [isQuestion, setIsQuestion] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Fetch notes for this lesson
  React.useEffect(() => {
    fetchNotes();
  }, [lessonId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/student/notes?lesson_id=${lessonId}`);
      if (res.ok) {
        const data = await res.json();
        // Sort by timestamp (nulls last), then by created_at
        const sorted = (data.notes || []).sort((a: VideoNote, b: VideoNote) => {
          const ta = a.content_position ?? Infinity;
          const tb = b.content_position ?? Infinity;
          if (ta !== tb) return ta - tb;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        setNotes(sorted);
      }
    } catch (err) {
      console.error('Error fetching video notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      const tags = isQuestion ? ['question'] : [];
      const res = await fetch('/api/student/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          course_id: courseId || null,
          content: newContent.trim(),
          content_position: Math.round(currentTime),
          highlight_color: isQuestion ? 'blue' : 'yellow',
          tags,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(prev => {
          const updated = [...prev, data.note];
          return updated.sort((a, b) => {
            const ta = a.content_position ?? Infinity;
            const tb = b.content_position ?? Infinity;
            if (ta !== tb) return ta - tb;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
        });
        setNewContent('');
        setIsQuestion(false);
        // Scroll to bottom
        setTimeout(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/student/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveNote();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5" />
          Notes & Questions
          {notes.length > 0 && <span className="text-gray-400 font-normal">({notes.length})</span>}
        </h3>
      </div>

      {/* Notes list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {loading ? (
          <div className="text-center py-6 text-xs text-gray-400">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-6 px-3">
            <StickyNote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No notes yet</p>
            <p className="text-[11px] text-gray-400 mt-1">Add a note or question at any point in the video</p>
          </div>
        ) : (
          notes.map((note) => {
            const isQ = note.tags?.includes('question');
            return (
              <div
                key={note.id}
                className={`group relative rounded-lg p-2.5 border text-sm cursor-pointer transition-colors ${
                  isQ
                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                }`}
                onClick={() => {
                  if (note.content_position != null) {
                    onSeek(note.content_position);
                  }
                }}
              >
                {/* Timestamp badge */}
                {note.content_position != null && (
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className={`w-3 h-3 ${isQ ? 'text-blue-400' : 'text-yellow-500'}`} />
                    <span className={`text-[11px] font-mono ${isQ ? 'text-blue-500' : 'text-yellow-600'}`}>
                      {formatTimestamp(note.content_position)}
                    </span>
                    {isQ && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded ml-1">
                        Question
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[13px] text-gray-800 leading-snug whitespace-pre-wrap break-words">{note.content}</p>
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note.id);
                  }}
                  disabled={deletingId === note.id}
                  className="absolute top-1.5 right-1.5 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Delete note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* New note input */}
      <div className="flex-shrink-0 border-t border-gray-200 p-2 bg-gray-50">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimestamp(currentTime)}
          </span>
          <button
            onClick={() => setIsQuestion(!isQuestion)}
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
              isQuestion
                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Toggle question mode"
          >
            <MessageCircleQuestion className="w-3 h-3" />
            {isQuestion ? 'Question' : 'Note'}
          </button>
        </div>
        <div className="flex gap-1.5">
          <textarea
            ref={inputRef}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isQuestion ? 'Ask a question at this timestamp...' : 'Add a note at this timestamp...'}
            rows={2}
            className="flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 resize-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 placeholder:text-gray-400"
          />
          <button
            onClick={saveNote}
            disabled={saving || !newContent.trim()}
            className="self-end px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-md transition-colors flex-shrink-0"
            aria-label="Save note"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Enter to save · Shift+Enter for new line · Click a note to jump</p>
      </div>
    </div>
  );
}
