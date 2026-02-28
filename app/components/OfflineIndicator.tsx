"use client";

import React, { useEffect, useState } from 'react';
import { isOnline } from '@/lib/pwa-utils';
import { Icon } from '@iconify/react';

interface OfflineIndicatorProps {
  className?: string;
}

export default function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const [online, setOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setOnline(isOnline());

    const handleOnline = () => {
      setOnline(true);
      setShowBanner(false);
    };

    const handleOffline = () => {
      setOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className="bg-yellow-500 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Icon icon="material-symbols:wifi-off" className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              You're currently offline. Some features may be limited.
            </p>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="flex-shrink-0 hover:bg-yellow-600 rounded p-1 transition-colors"
            aria-label="Dismiss"
          >
            <Icon icon="material-symbols:close" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}


