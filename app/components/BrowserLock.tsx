'use client';

import React, { useEffect, useRef } from 'react';
import { createBrowserLock, BrowserLock, BrowserViolation } from '@/lib/proctoring/browser-lock';

interface BrowserLockProps {
  sessionId: string;
  config: {
    preventCopyPaste?: boolean;
    preventNewTabs?: boolean;
    preventPrinting?: boolean;
    preventScreenCapture?: boolean;
    requireFullscreen?: boolean;
    allowSwitchingTabs?: boolean;
    maxTabSwitches?: number;
  };
  onViolation?: (violation: BrowserViolation) => void;
  enabled?: boolean;
}

export default function BrowserLockComponent({
  sessionId,
  config,
  onViolation,
  enabled = true,
}: BrowserLockProps) {
  const browserLockRef = useRef<BrowserLock | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Create browser lock
    const browserLock = createBrowserLock({
      preventCopyPaste: config.preventCopyPaste ?? true,
      preventNewTabs: config.preventNewTabs ?? true,
      preventPrinting: config.preventPrinting ?? true,
      preventScreenCapture: config.preventScreenCapture ?? true,
      requireFullscreen: config.requireFullscreen ?? false,
      allowSwitchingTabs: config.allowSwitchingTabs ?? false,
      maxTabSwitches: config.maxTabSwitches ?? 0,
      onViolation: (violation) => {
        // Record violation via API
        fetch('/api/proctoring/event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            event_type: violation.type,
            severity: violation.severity,
            metadata: violation.metadata,
          }),
        }).catch(console.error);

        // Call custom handler if provided
        if (onViolation) {
          onViolation(violation);
        }
      },
    });

    browserLockRef.current = browserLock;

    // Start locking
    browserLock.start();

    // Cleanup on unmount
    return () => {
      browserLock.stop();
    };
  }, [enabled, sessionId, config, onViolation]);

  // This component doesn't render anything visible
  return null;
}

