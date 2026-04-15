'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function getNotificationIcon(type: string): { icon: string; color: string } {
  switch (type) {
    case 'grade_posted': return { icon: 'mdi:chart-line', color: 'text-green-500' };
    case 'discussion_reply': return { icon: 'mdi:message-reply-text', color: 'text-blue-500' };
    case 'course_enrollment': return { icon: 'mdi:school', color: 'text-indigo-500' };
    case 'assignment_due_reminder': return { icon: 'mdi:clipboard-alert', color: 'text-orange-500' };
    case 'course_announcement': return { icon: 'mdi:bullhorn', color: 'text-amber-500' };
    default: return { icon: 'mdi:bell-outline', color: 'text-gray-400' };
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SidebarNotificationsWidget() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications/in-app?limit=5')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const items = data.notifications || data || [];
          if (Array.isArray(items)) {
            setNotifications(items.slice(0, 5));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icon icon="mdi:bell-outline" className="w-4 h-4 text-amber-500" />
          Notifications
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="px-4 py-6 text-center">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No new notifications
          </div>
        ) : (
          notifications.map(notif => {
            const iconCfg = getNotificationIcon(notif.type);
            return (
              <div key={notif.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-2.5">
                  <Icon icon={iconCfg.icon} className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconCfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-tight line-clamp-1">
                      {notif.title || notif.message}
                    </p>
                    {notif.title && notif.message && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{notif.message}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-0.5">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <Link href="/profile/notifications" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View All Notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
