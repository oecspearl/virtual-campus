'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  message: string;
  announcement_type: 'info' | 'warning' | 'error' | 'success' | 'maintenance';
  target_roles?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_dismissible: boolean;
  show_on_login: boolean;
  show_in_dashboard: boolean;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  send_notification: boolean;
  notification_channels: string[];
  created_at: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, [filterActive]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      // In production, this would be an admin-only endpoint
      // For now, we'll use the regular endpoint but filter server-side
      const response = await fetch('/api/announcements');
      if (response.ok) {
        const data = await response.json();
        // In production, create a separate admin endpoint
        setAnnouncements(data);
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      // In production, create PUT endpoint
      // For now, we'll just update locally
      setAnnouncements(announcements.map(a => 
        a.id === id ? { ...a, is_active: !currentStatus } : a
      ));
    } catch (error) {
      console.error('Failed to toggle announcement:', error);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      // In production, create DELETE endpoint
      setAnnouncements(announcements.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'normal': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const filteredAnnouncements = filterActive === null
    ? announcements
    : announcements.filter(a => a.is_active === filterActive);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">Global Announcements</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage system-wide announcements and alerts
            </p>
          </div>
          <Link href="/admin/announcements/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
              Create Announcement
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <button
            onClick={() => setFilterActive(null)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filterActive === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterActive(true)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filterActive === true
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterActive(false)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filterActive === false
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Icon icon="material-symbols:campaign" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Announcements</h3>
          <p className="text-gray-600 mb-6">Create your first announcement to get started.</p>
          <Link href="/admin/announcements/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
              Create Announcement
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(announcement.announcement_type)}`}>
                      {announcement.announcement_type}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority}
                    </span>
                    {announcement.is_active ? (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {announcement.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4">{announcement.message}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {announcement.target_roles && announcement.target_roles.length > 0 && (
                      <div className="flex items-center">
                        <Icon icon="material-symbols:people" className="w-4 h-4 mr-1" />
                        <span>Roles: {announcement.target_roles.join(', ')}</span>
                      </div>
                    )}
                    {announcement.start_date && (
                      <div className="flex items-center">
                        <Icon icon="material-symbols:schedule" className="w-4 h-4 mr-1" />
                        <span>Starts: {new Date(announcement.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {announcement.end_date && (
                      <div className="flex items-center">
                        <Icon icon="material-symbols:event" className="w-4 h-4 mr-1" />
                        <span>Ends: {new Date(announcement.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {announcement.show_on_login && (
                      <div className="flex items-center">
                        <Icon icon="material-symbols:login" className="w-4 h-4 mr-1" />
                        <span>Shows on login</span>
                      </div>
                    )}
                    {announcement.send_notification && (
                      <div className="flex items-center">
                        <Icon icon="material-symbols:notifications" className="w-4 h-4 mr-1" />
                        <span>Notifications: {announcement.notification_channels.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Link href={`/admin/announcements/${announcement.id}`}>
                    <Button variant="outline">
                      <Icon icon="material-symbols:edit" className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                                       onClick={() => toggleActive(announcement.id, announcement.is_active)}
                  >
                    <Icon 
                      icon={announcement.is_active ? "material-symbols:pause" : "material-symbols:play-arrow"} 
                      className="w-4 h-4 mr-1" 
                    />
                    {announcement.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                                       onClick={() => deleteAnnouncement(announcement.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Icon icon="material-symbols:delete" className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

