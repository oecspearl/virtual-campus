"use client";

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa-utils';

export default function PWARegistration() {
  useEffect(() => {
    // Register service worker on mount
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker().catch((error) => {
        console.error('Failed to register service worker:', error);
      });
    }
  }, []);

  return null; // This component doesn't render anything
}


