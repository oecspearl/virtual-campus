'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'maintenance';
}

const typeConfig: Record<string, { bg: string; border: string; icon: string; iconColor: string }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'mdi:information', iconColor: 'text-blue-500' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'mdi:alert', iconColor: 'text-amber-500' },
  error: { bg: 'bg-red-50', border: 'border-red-200', icon: 'mdi:alert-circle', iconColor: 'text-red-500' },
  success: { bg: 'bg-green-50', border: 'border-green-200', icon: 'mdi:check-circle', iconColor: 'text-green-500' },
  maintenance: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'mdi:wrench', iconColor: 'text-purple-500' },
};

export default function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/announcements')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const announcements = data?.announcements || data || [];
        if (Array.isArray(announcements) && announcements.length > 0) {
          setAnnouncement(announcements[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = async () => {
    if (!announcement) return;
    setDismissed(prev => new Set([...prev, announcement.id]));
    setAnnouncement(null);
    try {
      await fetch(`/api/announcements/${announcement.id}/dismiss`, { method: 'POST' });
    } catch {}
  };

  if (!announcement || dismissed.has(announcement.id)) return null;

  const config = typeConfig[announcement.type] || typeConfig.info;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${config.bg} ${config.border}`}>
      <Icon icon={config.icon} className={`w-4 h-4 flex-shrink-0 ${config.iconColor}`} />
      <p className="text-sm text-gray-700 flex-1 line-clamp-1">
        <span className="font-medium">{announcement.title}</span>
        {announcement.message && <span className="ml-1 text-gray-500">— {announcement.message}</span>}
      </p>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-full hover:bg-white/50 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <Icon icon="mdi:close" className="w-3.5 h-3.5 text-gray-400" />
      </button>
    </div>
  );
}
