'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Lock,
  MessageCircle,
  Calendar,
  ChevronRight,
  UserPlus,
  LogOut,
} from 'lucide-react';

interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  course?: {
    id: string;
    title: string;
  };
  is_private: boolean;
  max_members: number;
  member_count: number;
  avatar_url?: string;
  is_member?: boolean;
  my_role?: string;
  unread_messages?: number;
  created_at: string;
  updated_at: string;
}

interface StudyGroupCardProps {
  group: StudyGroup;
  onJoin?: (groupId: string) => Promise<void>;
  onLeave?: (groupId: string) => Promise<void>;
  variant?: 'compact' | 'detailed';
}

export default function StudyGroupCard({
  group,
  onJoin,
  onLeave,
  variant = 'detailed',
}: StudyGroupCardProps) {
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!onJoin) return;
    setLoading(true);
    try {
      await onJoin(group.id);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!onLeave || !confirm('Are you sure you want to leave this group?')) return;
    setLoading(true);
    try {
      await onLeave(group.id);
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <Link
        href={`/student/study-groups/${group.id}`}
        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
          {group.avatar_url ? (
            <img
              src={group.avatar_url}
              alt={group.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            group.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {group.name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {group.member_count} members
          </p>
        </div>
        {group.unread_messages && group.unread_messages > 0 && (
          <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
            {group.unread_messages > 9 ? '9+' : group.unread_messages}
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </Link>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {group.avatar_url ? (
              <img
                src={group.avatar_url}
                alt={group.name}
                className="w-full h-full rounded-lg object-cover"
              />
            ) : (
              group.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {group.name}
              </h3>
              {group.is_private && (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
            </div>
            {group.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {group.description}
              </p>
            )}
            {group.course && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {group.course.title}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700">
        <div className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {group.member_count}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            / {group.max_members}
          </p>
        </div>
        <div className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Chat
            </span>
          </div>
          {group.unread_messages && group.unread_messages > 0 ? (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              {group.unread_messages} new
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Active
            </p>
          )}
        </div>
        <div className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Events
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Coming soon
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex gap-2">
        {group.is_member ? (
          <>
            <Link
              href={`/student/study-groups/${group.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Open Group
            </Link>
            {group.my_role !== 'owner' && (
              <button
                onClick={handleLeave}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Leave group"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </>
        ) : (
          <>
            <Link
              href={`/student/study-groups/${group.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              View Details
            </Link>
            {!group.is_private && group.member_count < group.max_members && (
              <button
                onClick={handleJoin}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Join
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * StudyGroupList - List of study groups
 */
export function StudyGroupList({
  groups,
  onJoin,
  onLeave,
  compact = false,
}: {
  groups: StudyGroup[];
  onJoin?: (groupId: string) => Promise<void>;
  onLeave?: (groupId: string) => Promise<void>;
  compact?: boolean;
}) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No study groups yet</p>
        <p className="text-sm mt-1">Create or join a group to study together</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {groups.map((group) => (
          <StudyGroupCard
            key={group.id}
            group={group}
            onJoin={onJoin}
            onLeave={onLeave}
            variant="compact"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <StudyGroupCard
          key={group.id}
          group={group}
          onJoin={onJoin}
          onLeave={onLeave}
        />
      ))}
    </div>
  );
}
