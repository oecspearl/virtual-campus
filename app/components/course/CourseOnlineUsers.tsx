'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';

interface OnlinePresence {
  user_id: string;
  name: string;
  avatar: string | null;
  role: string;
  online_at: string;
}

interface CourseOnlineUsersProps {
  courseId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
  currentUserRole: string;
}

const ROLE_BADGE: Record<string, string> = {
  instructor: 'bg-blue-50 text-blue-700',
  curriculum_designer: 'bg-violet-50 text-violet-700',
  admin: 'bg-emerald-50 text-emerald-700',
  super_admin: 'bg-emerald-50 text-emerald-700',
  tenant_admin: 'bg-emerald-50 text-emerald-700',
  student: 'bg-gray-100 text-gray-600',
  parent: 'bg-amber-50 text-amber-700',
};

const ROLE_LABEL: Record<string, string> = {
  curriculum_designer: 'Designer',
  super_admin: 'Admin',
  tenant_admin: 'Admin',
};

function roleLabel(role: string) {
  return ROLE_LABEL[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

export default function CourseOnlineUsers({
  courseId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserRole,
}: CourseOnlineUsersProps) {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [users, setUsers] = useState<OnlinePresence[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable refs for values used inside the realtime callback so the channel
  // is only set up once per courseId/userId.
  const userPayloadRef = useRef({
    user_id: currentUserId,
    name: currentUserName,
    avatar: currentUserAvatar,
    role: currentUserRole,
  });
  userPayloadRef.current = {
    user_id: currentUserId,
    name: currentUserName,
    avatar: currentUserAvatar,
    role: currentUserRole,
  };

  useEffect(() => {
    if (!courseId || !currentUserId) return;

    const channel = supabase.channel(`course-presence:${courseId}`, {
      config: { presence: { key: currentUserId } },
    });

    const syncUsers = () => {
      const state = channel.presenceState() as Record<string, OnlinePresence[]>;
      const seen = new Map<string, OnlinePresence>();
      for (const presences of Object.values(state)) {
        for (const p of presences) {
          if (!p.user_id || p.user_id === currentUserId) continue;
          if (!seen.has(p.user_id)) seen.set(p.user_id, p);
        }
      }
      setUsers(Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name)));
    };

    channel
      .on('presence', { event: 'sync' }, syncUsers)
      .on('presence', { event: 'join' }, syncUsers)
      .on('presence', { event: 'leave' }, syncUsers)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            ...userPayloadRef.current,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [courseId, currentUserId, supabase]);

  const handleMessage = async (userId: string) => {
    setError(null);
    setMessagingId(userId);
    try {
      const res = await fetch(`/api/messages/direct/${userId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Could not open conversation');
        setMessagingId(null);
        return;
      }
      const data = await res.json();
      const roomId = data?.room?.id || data?.id;
      if (!roomId) {
        setError('Conversation room missing');
        setMessagingId(null);
        return;
      }
      router.push(`/messages/${roomId}`);
    } catch (err) {
      console.error('CourseOnlineUsers: message error', err);
      setError('Could not open conversation');
      setMessagingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
        className="w-full px-4 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Online now</h3>
          <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
            {users.length}
          </span>
        </div>
        <Icon
          icon="mdi:chevron-down"
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="p-2">
          {error && (
            <div className="px-3 py-2 mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg">
              {error}
            </div>
          )}
          {users.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-400 text-center">
              No one else is online right now.
            </p>
          ) : (
            users.map(u => (
              <div
                key={u.user_id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  {u.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-semibold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                    aria-label="online"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{u.name}</div>
                  <span
                    className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      ROLE_BADGE[u.role] || ROLE_BADGE.student
                    }`}
                  >
                    {roleLabel(u.role)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleMessage(u.user_id)}
                  disabled={messagingId === u.user_id}
                  title={`Message ${u.name}`}
                  aria-label={`Message ${u.name}`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {messagingId === u.user_id ? (
                    <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon icon="mdi:message-outline" className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
