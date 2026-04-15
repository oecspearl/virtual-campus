'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import {
  requestNotificationPermission,
  isPushSupported,
  getNotificationPermission,
  onForegroundMessage,
  initializeFirebase,
} from '@/lib/firebase/config';
import { useSupabase } from '@/lib/supabase-provider';

interface PushNotificationManagerProps {
  onStatusChange?: (enabled: boolean) => void;
  showInlineStatus?: boolean;
}

export default function PushNotificationManager({
  onStatusChange,
  showInlineStatus = true,
}: PushNotificationManagerProps) {
  const { supabase } = useSupabase();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check support and permission on mount
    const supported = isPushSupported();
    setIsSupported(supported);

    if (supported) {
      const perm = getNotificationPermission();
      setPermission(perm);
      initializeFirebase();

      // Check if already subscribed
      checkSubscriptionStatus();

      // Listen for foreground messages
      const unsubscribe = onForegroundMessage((payload) => {
        console.log('Foreground message received:', payload);

        // Show a notification using the browser API
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'New Notification', {
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/icons/icon-192x192.png',
          });
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const hasTokens = data.preferences?.push_tokens?.length > 0;
        setIsSubscribed(hasTokens);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const handleEnablePush = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request permission and get token
      const token = await requestNotificationPermission();

      if (!token) {
        setError('Failed to get notification permission. Please check your browser settings.');
        setPermission(getNotificationPermission());
        return;
      }

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to enable notifications');
        return;
      }

      // Register token with backend
      const response = await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          token,
          platform: 'web',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to register for notifications');
      }

      setIsSubscribed(true);
      setPermission('granted');
      onStatusChange?.(true);

      // Show success notification
      if (Notification.permission === 'granted') {
        new Notification('Push Notifications Enabled', {
          body: 'You will now receive push notifications from this app.',
          icon: '/icons/icon-192x192.png',
        });
      }
    } catch (error: any) {
      console.error('Error enabling push notifications:', error);
      setError(error.message || 'Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      // Get current token to unregister
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        // Unregister from backend
        await fetch('/api/notifications/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            token: subscription.endpoint,
          }),
        });

        // Unsubscribe from push manager
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      onStatusChange?.(false);
    } catch (error: any) {
      console.error('Error disabling push notifications:', error);
      setError(error.message || 'Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <Icon icon="material-symbols:notifications-off" className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">
              Push notifications are not supported in your browser.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Try using a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center gap-3">
          <Icon icon="material-symbols:block" className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-sm text-red-700">
              Push notifications are blocked in your browser.
            </p>
            <p className="text-xs text-red-600 mt-1">
              To enable notifications, click the lock icon in your browser's address bar and allow notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Icon
              icon={isSubscribed ? 'material-symbols:notifications-active' : 'material-symbols:notifications'}
              className={`w-5 h-5 ${isSubscribed ? 'text-green-600' : 'text-gray-500'}`}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Browser Push Notifications</p>
            <p className="text-xs text-gray-500">
              {isSubscribed
                ? 'You will receive notifications even when the app is closed'
                : 'Get notified even when you are not using the app'}
            </p>
          </div>
        </div>

        <button
          onClick={isSubscribed ? handleDisablePush : handleEnablePush}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isSubscribed
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 animate-spin" />
              {isSubscribed ? 'Disabling...' : 'Enabling...'}
            </span>
          ) : isSubscribed ? (
            'Disable'
          ) : (
            'Enable'
          )}
        </button>
      </div>

      {showInlineStatus && isSubscribed && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <Icon icon="material-symbols:check-circle" className="w-4 h-4" />
            <span>Push notifications are enabled on this device</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <Icon icon="material-symbols:error" className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
