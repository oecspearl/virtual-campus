'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

const ANNOUNCEMENT_TYPES = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'success', label: 'Success' },
  { value: 'maintenance', label: 'Maintenance' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'curriculum_designer', label: 'Curriculum Designer' },
];

const NOTIFICATION_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' },
  { value: 'in_app', label: 'In-App' },
];

export default function CreateAnnouncementPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    announcement_type: 'info',
    target_roles: [] as string[],
    priority: 'normal',
    is_dismissible: true,
    show_on_login: false,
    show_in_dashboard: true,
    start_date: '',
    end_date: '',
    send_notification: false,
    notification_channels: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const toggleRole = (role: string) => {
    if (formData.target_roles.includes(role)) {
      setFormData({
        ...formData,
        target_roles: formData.target_roles.filter(r => r !== role),
      });
    } else {
      setFormData({
        ...formData,
        target_roles: [...formData.target_roles, role],
      });
    }
  };

  const toggleChannel = (channel: string) => {
    if (formData.notification_channels.includes(channel)) {
      setFormData({
        ...formData,
        notification_channels: formData.notification_channels.filter(c => c !== channel),
      });
    } else {
      setFormData({
        ...formData,
        notification_channels: [...formData.notification_channels, channel],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      alert('Please fill in title and message');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        }),
      });

      if (response.ok) {
        router.push('/admin/announcements');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create announcement');
      }
    } catch (error) {
      console.error('Failed to create announcement:', error);
      alert('Failed to create announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-normal text-slate-900 tracking-tight">Create Announcement</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create a system-wide announcement that will be shown to users
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Announcement Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={5}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.announcement_type}
                  onChange={(e) => setFormData({ ...formData, announcement_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {ANNOUNCEMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Targeting</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Roles (leave empty for all roles)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ROLES.map(role => (
                <label key={role.value} className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.target_roles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">{role.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Display Settings</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_dismissible}
                onChange={(e) => setFormData({ ...formData, is_dismissible: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Users can dismiss this announcement</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.show_on_login}
                onChange={(e) => setFormData({ ...formData, show_on_login: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show on login page</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.show_in_dashboard}
                onChange={(e) => setFormData({ ...formData, show_in_dashboard: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show in dashboard</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Scheduling</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date (optional)
              </label>
              <Input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (optional)
              </label>
              <Input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.send_notification}
                onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Send notification when announcement is created</span>
            </label>
            {formData.send_notification && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Channels
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {NOTIFICATION_CHANNELS.map(channel => (
                    <label key={channel.value} className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notification_channels.includes(channel.value)}
                        onChange={() => toggleChannel(channel.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">{channel.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Creating...' : 'Create Announcement'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/announcements')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

