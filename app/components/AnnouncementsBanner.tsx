'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';

interface Announcement {
  id: string;
  title: string;
  message: string;
  announcement_type: 'info' | 'warning' | 'error' | 'success' | 'maintenance';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_dismissible: boolean;
}

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.slice(0, 3)); // Show max 3
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAnnouncement = async (id: string) => {
    try {
      await fetch(`/api/announcements/${id}/dismiss`, {
        method: 'POST',
      });
      setAnnouncements(announcements.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to dismiss announcement:', error);
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'maintenance':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error':
        return 'material-symbols:error';
      case 'warning':
        return 'material-symbols:warning';
      case 'success':
        return 'material-symbols:check-circle';
      case 'maintenance':
        return 'material-symbols:build';
      default:
        return 'material-symbols:info';
    }
  };

  if (loading || announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className={`border rounded-lg p-4 ${getTypeStyles(announcement.announcement_type)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start flex-1">
              <Icon
                icon={getTypeIcon(announcement.announcement_type)}
                className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{announcement.title}</h4>
                <p className="text-sm">{announcement.message}</p>
              </div>
            </div>
            {announcement.is_dismissible && (
              <button
                onClick={() => dismissAnnouncement(announcement.id)}
                className="ml-4 text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="Dismiss"
              >
                <Icon icon="material-symbols:close" className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

