'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import WhiteboardEditor from '@/app/components/whiteboard/WhiteboardEditor';
import RoleGuard from '@/app/components/RoleGuard';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';
import { useSupabase } from '@/lib/supabase-provider';
import { ArrowLeft } from 'lucide-react';

export default function BoardEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSupabase();
  const [board, setBoard] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBoard();
  }, [id]);

  const loadBoard = async () => {
    try {
      const [boardRes, profileRes] = await Promise.all([
        fetch(`/api/whiteboards/${id}`),
        fetch('/api/auth/profile'),
      ]);
      if (boardRes.ok) {
        setBoard(await boardRes.json());
      } else {
        setError('Whiteboard not found');
      }
      if (profileRes.ok) {
        setProfile(await profileRes.json());
      }
    } catch (err) {
      setError('Failed to load whiteboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingIndicator variant="pencil" text="Opening board..." />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-500 mb-4">{error || 'Board not found'}</p>
        <button
          onClick={() => router.push('/boards')}
          className="text-blue-600 hover:underline text-sm"
        >
          Back to Boards
        </button>
      </div>
    );
  }

  return (
    <RoleGuard roles={['instructor', 'admin', 'super_admin', 'tenant_admin', 'curriculum_designer', 'student']}>
      <div className="h-screen flex flex-col">
        {/* Minimal header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200">
          <button
            onClick={() => router.push('/boards')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            title="Back to boards"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400">Whiteboards</span>
        </div>

        {/* Full-height editor */}
        <div className="flex-1">
          <WhiteboardEditor
            whiteboardId={board.id}
            initialElements={board.elements || []}
            initialAppState={board.app_state || {}}
            title={board.title}
            collaboration={board.collaboration}
            onTitleChange={(title) => setBoard({ ...board, title })}
            autoSaveInterval={15000}
            userId={user?.id || profile?.id}
            userName={profile?.name || user?.email || 'Anonymous'}
          />
        </div>
      </div>
    </RoleGuard>
  );
}
