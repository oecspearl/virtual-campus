"use client";

import React, { useEffect, useState } from 'react';
import { 
  isInstallPromptAvailable, 
  setDeferredPrompt, 
  triggerInstallPrompt,
  isPWAInstalled 
} from '@/lib/pwa-utils';
import { Icon } from '@iconify/react';

interface PWAInstallPromptProps {
  className?: string;
}

export default function PWAInstallPrompt({ className = '' }: PWAInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsInstalled(isPWAInstalled());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as any);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if prompt is available
    if (isInstallPromptAvailable() && !isInstalled) {
      // Show prompt after a delay (user experience)
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    try {
      const installed = await triggerInstallPrompt();
      if (installed) {
        setShowPrompt(false);
        setIsInstalled(true);
      } else {
        // If prompt failed, try manual installation instructions
        console.log('Install prompt not available. User may need to install manually.');
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Error during installation:', error);
      setShowPrompt(false);
    }
  };

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowPrompt(false);
    // Store dismissal in localStorage to avoid showing again for a while
    try {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    } catch (error) {
      console.error('Error saving dismissal to localStorage:', error);
    }
  };

  // Don't show if already installed or if dismissed recently
  if (isInstalled || !showPrompt) {
    return null;
  }

  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  if (dismissedTime) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 7) {
      return null; // Don't show again for 7 days
    }
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999] ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 backdrop-blur-md pointer-events-auto">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Icon icon="material-symbols:download" className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Install OECS MyPD
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Install our app for a better experience with offline access and faster loading.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="flex-1 px-4 py-2 bg-slate-800 text-white font-medium rounded-lg  transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
              >
                Install
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <Icon icon="material-symbols:close" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

