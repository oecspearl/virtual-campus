'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Search, X, Key } from 'lucide-react';
import AccessibleModal from '@/app/components/ui/AccessibleModal';
import { StudyGroupList } from '@/app/components/student';

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

export default function StudyGroupsPage() {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    is_private: true,
    max_members: 10,
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/student/study-groups?include_public=true');
      const data = await response.json();

      if (response.ok) {
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;

    try {
      const response = await fetch('/api/student/study-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(prev => [{ ...data.group, is_member: true, my_role: 'owner', member_count: 1 }, ...prev]);
        setShowCreateModal(false);
        setNewGroup({ name: '', description: '', is_private: true, max_members: 10 });
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      const response = await fetch('/api/student/study-groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: joinCode }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchGroups();
        setShowJoinModal(false);
        setJoinCode('');
        alert(`Successfully joined ${data.group.name}!`);
      } else {
        alert(data.error || 'Failed to join group');
      }
    } catch (err) {
      console.error('Failed to join group:', err);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await fetch('/api/student/study-groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
      });

      if (response.ok) {
        setGroups(prev =>
          prev.map(g =>
            g.id === groupId
              ? { ...g, is_member: true, my_role: 'member', member_count: g.member_count + 1 }
              : g
          )
        );
      }
    } catch (err) {
      console.error('Failed to join group:', err);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/student/study-groups/join?group_id=${groupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setGroups(prev =>
          prev.map(g =>
            g.id === groupId
              ? { ...g, is_member: false, my_role: undefined, member_count: g.member_count - 1 }
              : g
          )
        );
      }
    } catch (err) {
      console.error('Failed to leave group:', err);
    }
  };

  const myGroups = groups.filter(g => g.is_member);
  const publicGroups = groups.filter(g => !g.is_member && !g.is_private);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-purple-600" />
              Study Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Collaborate and learn together with your peers
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Key className="w-4 h-4" />
              Join with Code
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* My Groups */}
            {myGroups.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  My Groups
                </h2>
                <StudyGroupList
                  groups={myGroups}
                  onLeave={handleLeaveGroup}
                />
              </section>
            )}

            {/* Discover Public Groups */}
            {publicGroups.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Discover Groups
                </h2>
                <StudyGroupList
                  groups={publicGroups}
                  onJoin={handleJoinGroup}
                />
              </section>
            )}

            {myGroups.length === 0 && publicGroups.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No study groups yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Create your own group or join one with an invite code
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create Your First Group
                </button>
              </div>
            )}
          </>
        )}

        {/* Create Group Modal */}
        <AccessibleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Study Group"
          size="md"
        >
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={newGroup.name}
                onChange={(e) =>
                  setNewGroup(prev => ({ ...prev, name: e.target.value }))
                }
                required
                placeholder="e.g., Calculus Study Squad"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={newGroup.description}
                onChange={(e) =>
                  setNewGroup(prev => ({ ...prev, description: e.target.value }))
                }
                rows={3}
                placeholder="What's your group about?"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Members
              </label>
              <input
                type="number"
                value={newGroup.max_members}
                onChange={(e) =>
                  setNewGroup(prev => ({ ...prev, max_members: parseInt(e.target.value) || 10 }))
                }
                min={2}
                max={50}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_private"
                checked={newGroup.is_private}
                onChange={(e) =>
                  setNewGroup(prev => ({ ...prev, is_private: e.target.checked }))
                }
                className="w-4 h-4 text-purple-600 rounded"
              />
              <label htmlFor="is_private" className="text-sm text-gray-700 dark:text-gray-300">
                Private group (invite only)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Group
              </button>
            </div>
          </form>
        </AccessibleModal>

        {/* Join with Code Modal */}
        <AccessibleModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          title="Join with Code"
          size="sm"
        >
          <form onSubmit={handleJoinWithCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invite Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
                placeholder="Enter 8-character code"
                maxLength={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg tracking-widest"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Join
              </button>
            </div>
          </form>
        </AccessibleModal>
      </div>
    </div>
  );
}
