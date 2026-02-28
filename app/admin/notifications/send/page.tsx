'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';

interface User {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  role: string;
}

export default function SendNotificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    type: 'general',
    title: '',
    message: '',
    link_url: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    channels: {
      email: false,
      sms: false,
      whatsapp: false,
      push: false,
      in_app: true,
    },
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedUsers(filteredUsers.map(u => u.id));
  };

  const deselectAll = () => {
    setSelectedUsers([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    if (!formData.title || !formData.message) {
      alert('Please fill in title and message');
      return;
    }

    if (!Object.values(formData.channels).some(v => v)) {
      alert('Please select at least one notification channel');
      return;
    }

    setLoading(true);

    try {
      // Send to each selected user
      const results = await Promise.allSettled(
        selectedUsers.map(userId =>
          fetch('/api/notifications/omnichannel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              type: formData.type,
              title: formData.title,
              message: formData.message,
              link_url: formData.link_url || undefined,
              channels: formData.channels,
              priority: formData.priority,
            }),
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        alert(`Successfully sent ${successCount} notification(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
        router.push('/admin/announcements');
      } else {
        alert('Failed to send notifications. Please try again.');
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      alert('An error occurred while sending notifications');
    } finally {
      setLoading(false);
    }
  };

  const usersWithWhatsApp = filteredUsers.filter(u => u.phone_number);
  const selectedUsersWithWhatsApp = selectedUsers.filter(id => 
    users.find(u => u.id === id && u.phone_number)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            <Icon icon="material-symbols:arrow-back" className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Send Notification</h1>
          <p className="text-gray-600 mt-2">Send messages via Email, SMS, WhatsApp, Push, or In-App notifications</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Notification Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Notification Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="assignment_due">Assignment Due</option>
                  <option value="grade_posted">Grade Posted</option>
                  <option value="course_announcement">Course Announcement</option>
                  <option value="system_announcement">System Announcement</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter notification title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter notification message"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/page"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Channels */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Notification Channels</h2>
            <p className="text-sm text-gray-600 mb-4">Select which channels to send this notification through</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.channels.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    channels: { ...formData.channels, email: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Email</div>
                  <div className="text-sm text-gray-500">Send via email</div>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.channels.sms}
                  onChange={(e) => setFormData({
                    ...formData,
                    channels: { ...formData.channels, sms: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">SMS</div>
                  <div className="text-sm text-gray-500">Text message</div>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.channels.whatsapp}
                  onChange={(e) => setFormData({
                    ...formData,
                    channels: { ...formData.channels, whatsapp: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    WhatsApp
                    {formData.channels.whatsapp && selectedUsersWithWhatsApp.length < selectedUsers.length && (
                      <span className="text-xs text-orange-600">
                        ({selectedUsersWithWhatsApp.length}/{selectedUsers.length} have phone)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">WhatsApp message</div>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.channels.push}
                  onChange={(e) => setFormData({
                    ...formData,
                    channels: { ...formData.channels, push: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Push</div>
                  <div className="text-sm text-gray-500">Push notification</div>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.channels.in_app}
                  onChange={(e) => setFormData({
                    ...formData,
                    channels: { ...formData.channels, in_app: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">In-App</div>
                  <div className="text-sm text-gray-500">In-app notification</div>
                </div>
              </label>
            </div>
          </div>

          {/* User Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Select Recipients</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No users found</div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">{user.name || 'No name'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.phone_number && (
                          <div className="text-xs text-green-600 mt-1">
                            <Icon icon="material-symbols:phone" className="w-3 h-3 inline mr-1" />
                            {user.phone_number}
                          </div>
                        )}
                        {!user.phone_number && (formData.channels.whatsapp || formData.channels.sms) && (
                          <div className="text-xs text-orange-600 mt-1">
                            No phone number - WhatsApp/SMS unavailable
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">{user.role}</div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Selected: <span className="font-semibold">{selectedUsers.length}</span> user(s)
              {formData.channels.whatsapp && (
                <span className="ml-4">
                  With WhatsApp: <span className="font-semibold">{selectedUsersWithWhatsApp.length}</span>
                </span>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedUsers.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Icon icon="svg-spinners:ring-resize" className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Icon icon="material-symbols:send" className="w-4 h-4 mr-2" />
                  Send Notification{selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ''}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}









