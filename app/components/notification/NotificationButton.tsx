'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import NotificationDropdown from './NotificationDropdown';

interface NotificationButtonProps {
  userId: string;
}

export default function NotificationButton({ userId }: NotificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const authFailedRef = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    // Stop polling if a previous request returned 401
    if (authFailedRef.current) return;

    try {
      const res = await fetch('/api/notifications/in-app?limit=1&unread_only=true');
      if (res.status === 401) {
        // Auth expired — stop all future polling
        authFailedRef.current = true;
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // Network error — silently ignore, next poll will retry
    }
  }, []);

  // Fetch unread count
  useEffect(() => {
    if (!userId) return;
    authFailedRef.current = false;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [userId, fetchUnreadCount]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
        title="Notifications"
      >
        <Icon icon="material-symbols:notifications" className="w-5 h-5" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}
      </button>
      <NotificationDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userId={userId}
      />
    </div>
  );
}

