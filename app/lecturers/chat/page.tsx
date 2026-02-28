'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { hasRole } from '@/lib/rbac';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/Button';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  room_type: string;
  subject_area: string | null;
  created_by: string;
  created_by_user: {
    id: string;
    name: string;
    email: string;
  };
  member_count: number;
  last_message_at: string | null;
  members: Array<{
    user_id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export default function LecturerChatPage() {
  const { user, supabase, loading: authLoading } = useSupabase();
  const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    room_type: 'group',
    subject_area: '',
  });

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/auth/profile', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
              const profile = await res.json();
              setUserRole(profile?.role || user.user_metadata?.role || 'student');
              setRoleLoading(false);
              return;
            }
          }
          // Fallback to user_metadata
          setUserRole(user.user_metadata?.role || 'student');
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(user.user_metadata?.role || 'student');
        }
      }
      setRoleLoading(false);
    };

    fetchUserRole();
  }, [user, supabase]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading || roleLoading) return;
    
    // Only redirect if auth has finished loading and user is still null
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (userRole && !hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      router.push('/dashboard');
      return;
    }

    if (userRole && hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      fetchRooms();
    }
  }, [user, userRole, roleLoading, authLoading, router]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/lecturers/chat/rooms');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}: Failed to fetch chat rooms`;
        console.error('Error fetching rooms:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (err: any) {
      console.error('Error fetching rooms:', err);
      setError(err.message || 'Failed to fetch chat rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/lecturers/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRoom,
          subject_area: newRoom.subject_area || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create room');
      }

      const data = await response.json();
      setShowCreateModal(false);
      setNewRoom({ name: '', description: '', room_type: 'group', subject_area: '' });
      router.push(`/lecturers/chat/${data.room.id}`);
    } catch (err: any) {
      console.error('Error creating room:', err);
      alert(err.message);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No messages yet';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Show loading state while auth or role is loading
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // If auth finished loading and no user, show nothing (redirect will happen)
  if (!user) {
    return null;
  }

  if (userRole && !hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Virtual Staff Room
              </h1>
              <p className="text-gray-600">
                Connect and collaborate with fellow lecturers in real-time
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
            >
              <Icon icon="mdi:plus" className="mr-2" />
              Create Room
            </Button>
          </div>
        </div>

        {/* Chat Rooms List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            {error}
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Icon icon="mdi:chat-outline" className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No chat rooms yet</h3>
            <p className="text-gray-500 mb-6">Create your first chat room to start collaborating!</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
            >
              Create First Room
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/lecturers/chat/${room.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-[#0066CC] rounded-lg flex items-center justify-center">
                        <Icon icon="mdi:chat" className="text-2xl text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{room.name}</h3>
                        {room.subject_area && (
                          <div className="text-sm text-gray-500">{room.subject_area}</div>
                        )}
                      </div>
                    </div>
                    {room.description && (
                      <p className="text-gray-600 mb-4">{room.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Icon icon="mdi:account-group" />
                        {room.member_count} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="mdi:clock-outline" />
                        {formatDate(room.last_message_at)}
                      </span>
                    </div>
                  </div>
                  <Icon
                    icon="mdi:chevron-right"
                    className="text-gray-400 text-2xl ml-4"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Room Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create Chat Room</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="mdi:close" className="text-2xl" />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                    placeholder="e.g., Mathematics Department"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newRoom.description}
                    onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                    placeholder="Describe the purpose of this room..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Type *
                  </label>
                  <select
                    required
                    value={newRoom.room_type}
                    onChange={(e) => setNewRoom({ ...newRoom, room_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                  >
                    <option value="group">Group Chat</option>
                    <option value="subject">Subject-Specific</option>
                    <option value="project">Project Team</option>
                  </select>
                </div>

                {newRoom.room_type === 'subject' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Area
                    </label>
                    <input
                      type="text"
                      value={newRoom.subject_area}
                      onChange={(e) => setNewRoom({ ...newRoom, subject_area: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#0066CC] hover:bg-[#0052A3] text-white"
                  >
                    Create Room
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

