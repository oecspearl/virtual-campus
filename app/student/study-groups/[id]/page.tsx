'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  MessageCircle,
  Settings,
  ArrowLeft,
  Send,
  Crown,
  Shield,
  User,
  Copy,
  Check,
  MoreVertical,
  Trash2,
  UserMinus,
  Calendar,
} from 'lucide-react';

interface Member {
  id: string;
  student_id: string;
  role: string;
  joined_at: string;
  last_active_at: string;
  student: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender?: {
    name: string;
    avatar_url: string | null;
  };
}

interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  course_id: string | null;
  created_by: string;
  is_private: boolean;
  max_members: number;
  join_code: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  course: { id: string; title: string } | null;
  creator: { id: string; name: string; avatar_url: string | null } | null;
  members: Member[];
  member_count: number;
}

export default function StudyGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'settings'>('chat');
  const [codeCopied, setCodeCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroup();
    fetchMessages();
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchGroup = async () => {
    try {
      const res = await fetch(`/api/student/study-groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
        setIsMember(data.is_member);
        setMyRole(data.my_role);
      } else if (res.status === 404) {
        router.push('/student/study-groups');
      }
    } catch (error) {
      console.error('Error fetching group:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/student/study-groups/${groupId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/student/study-groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const copyJoinCode = () => {
    if (group?.join_code) {
      navigator.clipboard.writeText(group.join_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const leaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      const res = await fetch(`/api/student/study-groups/${groupId}/members`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/student/study-groups');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const deleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/student/study-groups/${groupId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/student/study-groups');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Group not found</h2>
          <Link href="/student/study-groups" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Study Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/student/study-groups"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
                <p className="text-sm text-gray-500">
                  {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                  {group.course && ` • ${group.course.title}`}
                </p>
              </div>
            </div>
            {isMember && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`p-2 rounded-lg transition-colors ${
                    activeTab === 'chat' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`p-2 rounded-lg transition-colors ${
                    activeTab === 'members' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-5 h-5" />
                </button>
                {['owner', 'admin'].includes(myRole || '') && (
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`p-2 rounded-lg transition-colors ${
                      activeTab === 'settings' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {!isMember ? (
          /* Non-member view */
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              This is a private group
            </h2>
            <p className="text-gray-600 mb-6">
              You need an invite code to join this group.
            </p>
            <Link
              href="/student/study-groups"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Study Groups
            </Link>
          </div>
        ) : activeTab === 'chat' ? (
          /* Chat view */
          <div className="bg-white rounded-xl shadow-sm flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {message.sender?.avatar_url ? (
                        <img
                          src={message.sender.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-blue-600">
                          {message.sender?.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-gray-900">
                          {message.sender?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700 break-words">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={sendMessage} className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        ) : activeTab === 'members' ? (
          /* Members view */
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Members ({group.member_count})
            </h2>
            <div className="space-y-3">
              {group.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {member.student?.avatar_url ? (
                        <img
                          src={member.student.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-blue-600">
                          {member.student?.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {member.student?.name || 'Unknown'}
                        </span>
                        {getRoleIcon(member.role)}
                      </div>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Settings view */
          <div className="space-y-6">
            {/* Group Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <p className="text-gray-900">{group.name}</p>
                </div>
                {group.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <p className="text-gray-900">{group.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Privacy
                  </label>
                  <p className="text-gray-900">{group.is_private ? 'Private' : 'Public'}</p>
                </div>
              </div>
            </div>

            {/* Invite Code */}
            {group.join_code && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Code</h2>
                <div className="flex items-center gap-3">
                  <code className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-mono text-lg">
                    {group.join_code}
                  </code>
                  <button
                    onClick={copyJoinCode}
                    className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Share this code with others to invite them to your group.
                </p>
              </div>
            )}

            {/* Danger Zone */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
              <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
              <div className="space-y-3">
                {myRole !== 'owner' && (
                  <button
                    onClick={leaveGroup}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <UserMinus className="w-4 h-4" />
                    Leave Group
                  </button>
                )}
                {myRole === 'owner' && (
                  <button
                    onClick={deleteGroup}
                    className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Group
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
