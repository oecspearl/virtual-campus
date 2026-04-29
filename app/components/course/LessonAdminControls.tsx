'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import RoleGuard from '@/app/components/RoleGuard';
import { useSupabase } from '@/lib/supabase-provider';

interface LessonAdminControlsProps {
  lessonId: string;
  lessonTitle: string;
  /** Notifies the parent so it can drop the lesson from local state. */
  onDeleted?: (lessonId: string) => void;
  /** Visual size — "sm" matches the in-list edit pencil, "md" sits on its own row. */
  size?: 'sm' | 'md';
  className?: string;
}

const ROLES = ['instructor', 'curriculum_designer', 'admin', 'super_admin', 'tenant_admin'] as const;

/**
 * Edit + Delete affordances for a lesson, gated to instructor-equivalent roles.
 * Server-side enforcement still happens in /api/lessons/[id] via canMutateLesson —
 * this component only hides the buttons; permission is re-checked on click.
 */
const LessonAdminControls: React.FC<LessonAdminControlsProps> = ({
  lessonId,
  lessonTitle,
  onDeleted,
  size = 'sm',
  className = '',
}) => {
  const { supabase } = useSupabase();
  const [deleting, setDeleting] = useState(false);

  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  const padding = size === 'md' ? 'p-2' : 'p-1';

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm(
      `Delete the lesson "${lessonTitle}"?\n\nThis cannot be undone. Student progress, submissions, and resources tied to this lesson will be removed.`,
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Your session has expired. Please sign in again.');
        return;
      }

      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'Failed to delete lesson');
        return;
      }

      onDeleted?.(lessonId);
    } catch (err) {
      console.error('Lesson delete error', err);
      alert('Network error while deleting lesson');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <RoleGuard roles={ROLES as unknown as string[]}>
      <div className={`flex items-center gap-1 ${className}`}>
        <Link
          href={`/lessons/${lessonId}/edit`}
          className={`${padding} text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors`}
          title="Edit lesson"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon icon="material-symbols:edit" className={iconSize} />
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className={`${padding} text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50`}
          title="Delete lesson"
        >
          <Icon
            icon={deleting ? 'material-symbols:hourglass-empty' : 'material-symbols:delete-outline'}
            className={`${iconSize} ${deleting ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
    </RoleGuard>
  );
};

export default LessonAdminControls;
