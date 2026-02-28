/**
 * Performance Tracker Component
 * 
 * Initializes Web Vitals tracking and performance monitoring
 */

'use client';

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/performance-monitor';

export default function PerformanceTracker() {
    useEffect(() => {
        // Initialize Web Vitals tracking
        initWebVitals();
    }, []);

    // This component doesn't render anything
    return null;
}
