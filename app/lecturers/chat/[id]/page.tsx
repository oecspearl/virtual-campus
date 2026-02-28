'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import { hasRole } from '@/lib/rbac';
import Button from '@/app/components/Button';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  sender_id: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  reply_to_id: string | null;
  reply_to: {
    id: string;
    content: string;
    sender: {
      id: string;
      name: string;
    };
  } | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  room_type: string;
  created_by_user: {
    id: string;
    name: string;
    email: string;
  };
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

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, supabase } = useSupabase();
  const roomId = params.id as string;

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (roleLoading) return;
    
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (userRole && !hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      router.push('/dashboard');
      return;
    }

    if (userRole && hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      fetchRoom();
      fetchMessages();
      setupRealtimeSubscription();
    }

    return () => {
      // Cleanup subscription on unmount
      if (supabase) {
        supabase.removeAllChannels();
      }
    };
  }, [user, userRole, roleLoading, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRoom = async () => {
    try {
      const response = await fetch(`/api/lecturers/chat/rooms/${roomId}`);
      if (!response.ok) throw new Error('Failed to fetch room');
      const data = await response.json();
      setRoom(data.room);
    } catch (err: any) {
      console.error('Error fetching room:', err);
      setError(err.message);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lecturers/chat/rooms/${roomId}/messages?limit=50`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!supabase || !roomId) return;

    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lecturer_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          // Fetch the new message with sender info
          fetch(`/api/lecturers/chat/rooms/${roomId}/messages?limit=1&offset=0`)
            .then((res) => res.json())
            .then((data) => {
              if (data.messages && data.messages.length > 0) {
                const newMessage = data.messages[0];
                setMessages((prev) => [...prev, newMessage]);
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !fileInputRef.current?.files?.length) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('content', message);
      if (replyingTo) {
        formData.append('reply_to_id', replyingTo.id);
      }

      const file = fileInputRef.current?.files?.[0];
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch(`/api/lecturers/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      setMessage('');
      setReplyingTo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchMessages();
    } catch (err: any) {
      console.error('Error sending message:', err);
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (roleLoading || !user) {
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

  if (userRole && !hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
    return null;
  }

  if (loading && !room) {
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

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            {error || 'Room not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col p-4">
        {/* Header */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/lecturers/chat')}
                className="text-[#0066CC] hover:text-[#0052A3]"
              >
                <Icon icon="mdi:arrow-left" className="text-2xl" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
                {room.description && (
                  <p className="text-sm text-gray-600">{room.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Icon icon="mdi:account-group" />
              <span>{room.members.length} members</span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Icon icon="mdi:chat-outline" className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isOwnMessage = msg.sender_id === user?.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] ${
                          isOwnMessage ? 'bg-[#0066CC] text-white' : 'bg-gray-100 text-gray-900'
                        } rounded-2xl p-4`}
                      >
                        {!isOwnMessage && (
                          <div className="font-semibold mb-1 text-sm">
                            {msg.sender?.name || 'Unknown'}
                          </div>
                        )}
                        {msg.reply_to && (
                          <div
                            className={`mb-2 p-2 rounded-lg text-sm border-l-4 ${
                              isOwnMessage
                                ? 'bg-blue-600 border-blue-400'
                                : 'bg-gray-200 border-gray-400'
                            }`}
                          >
                            <div className="font-medium text-xs mb-1">
                              {msg.reply_to.sender?.name}
                            </div>
                            <div className="text-xs opacity-90 line-clamp-2">
                              {msg.reply_to.content}
                            </div>
                          </div>
                        )}
                        {msg.is_deleted ? (
                          <div className="italic opacity-70">Message deleted</div>
                        ) : msg.message_type === 'file' && msg.file_url ? (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Icon icon="mdi:file" className="text-xl" />
                              <div>
                                <div className="font-medium">{msg.file_name}</div>
                                {msg.file_type && (
                                  <div className="text-xs opacity-80">
                                    {msg.file_type} • {formatFileSize(msg.file_size || 0)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm underline"
                            >
                              Download
                            </a>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                          <span>{formatDate(msg.created_at)}</span>
                          {msg.is_edited && <span>(edited)</span>}
                          {!isOwnMessage && (
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="hover:underline"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Reply Preview */}
          {replyingTo && (
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Icon icon="mdi:reply" />
                  <span className="text-gray-600">
                    Replying to <strong>{replyingTo.sender?.name}</strong>
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="mdi:close" />
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                {replyingTo.content}
              </div>
            </div>
          )}

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4">
            <div className="flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setMessage(e.target.files[0].name);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Attach file"
              >
                <Icon icon="mdi:paperclip" className="text-2xl" />
              </button>
              <div className="flex-1">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
                  rows={1}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent resize-none"
                />
              </div>
              <Button
                type="submit"
                disabled={sending || (!message.trim() && !fileInputRef.current?.files?.length)}
                className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-6"
              >
                {sending ? (
                  <Icon icon="mdi:loading" className="animate-spin" />
                ) : (
                  <Icon icon="mdi:send" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

