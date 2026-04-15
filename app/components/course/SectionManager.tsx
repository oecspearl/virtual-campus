'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';

export interface Section {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order: number;
  start_date: string | null;
  end_date: string | null;
  collapsed: boolean;
  published: boolean;
}

interface SectionManagerProps {
  courseId: string;
  sections: Section[];
  onSectionsChange: (sections: Section[]) => void;
  isWeekly?: boolean;
  courseStartDate?: string | null;
}

const SectionManager: React.FC<SectionManagerProps> = ({
  courseId,
  sections,
  onSectionsChange,
  isWeekly = false,
  courseStartDate,
}) => {
  const { supabase } = useSupabase();
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    return { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  };

  const addSection = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      const headers = await getAuthHeader();

      // For weekly format, auto-calc dates
      let start_date: string | null = null;
      let end_date: string | null = null;
      if (isWeekly && courseStartDate) {
        const base = new Date(courseStartDate);
        const weekOffset = sections.length;
        const start = new Date(base);
        start.setDate(start.getDate() + weekOffset * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        start_date = start.toISOString().split('T')[0];
        end_date = end.toISOString().split('T')[0];
      }

      const res = await fetch(`/api/courses/${courseId}/sections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, start_date, end_date }),
      });

      if (res.ok) {
        const section = await res.json();
        onSectionsChange([...sections, section]);
        setNewTitle('');
      }
    } catch (err) {
      console.error('Error adding section:', err);
    } finally {
      setAdding(false);
    }
  };

  const updateSection = async (sectionId: string) => {
    const title = editTitle.trim();
    if (!title) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/courses/${courseId}/sections`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: sectionId, title }),
      });

      if (res.ok) {
        const updated = await res.json();
        onSectionsChange(sections.map(s => s.id === sectionId ? updated : s));
        setEditingId(null);
      }
    } catch (err) {
      console.error('Error updating section:', err);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section? Lessons will be unlinked, not deleted.')) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/courses/${courseId}/sections?section_id=${sectionId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        onSectionsChange(sections.filter(s => s.id !== sectionId));
      }
    } catch (err) {
      console.error('Error deleting section:', err);
    }
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
  };

  return (
    <div className="space-y-2">
      {/* Existing sections list */}
      {sections.map((section, idx) => (
        <div key={section.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
            {idx + 1}
          </div>

          {editingId === section.id ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && updateSection(section.id)}
                className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button onClick={() => updateSection(section.id)} className="text-green-600 hover:text-green-700">
                <Icon icon="material-symbols:check" className="w-5 h-5" />
              </button>
              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                <Icon icon="material-symbols:close" className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800 truncate block">{section.title}</span>
                {isWeekly && section.start_date && section.end_date && (
                  <span className="text-xs text-gray-500">{formatDateRange(section.start_date, section.end_date)}</span>
                )}
              </div>
              <button
                onClick={() => { setEditingId(section.id); setEditTitle(section.title); }}
                className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                title="Edit section"
              >
                <Icon icon="material-symbols:edit" className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteSection(section.id)}
                className="text-gray-400 hover:text-red-600 flex-shrink-0"
                title="Delete section"
              >
                <Icon icon="material-symbols:delete" className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ))}

      {/* Add new section */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSection()}
          placeholder={isWeekly ? `Week ${sections.length + 1}` : `Topic ${sections.length + 1}`}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={addSection}
          disabled={adding || !newTitle.trim()}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Icon icon="material-symbols:add" className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
};

export default SectionManager;
