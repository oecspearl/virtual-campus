/**
 * Performance Monitoring Utilities for OECS LearnBoard
 * 
 * Tracks Core Web Vitals, API performance, and custom metrics.
 * Integrates with Vercel Analytics and provides custom tracking.
 */

// Core Web Vitals types
interface WebVitalsMetric {
    name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB' | 'INP';
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    delta: number;
    id: string;
    navigationType: string;
}

interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

interface APIPerformanceMetric {
    endpoint: string;
    method: string;
    duration: number;
    status: number;
    timestamp: number;
}

/**
 * Performance monitoring class
 */
class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private apiMetrics: APIPerformanceMetric[] = [];
    private maxMetrics = 100; // Keep last 100 metrics

    /**
     * Track Core Web Vitals
     */
    trackWebVital(metric: WebVitalsMetric): void {
        // Send to analytics endpoint
        this.sendToAnalytics({
            name: `web-vital-${metric.name}`,
            value: metric.value,
            timestamp: Date.now(),
            metadata: {
                rating: metric.rating,
                navigationType: metric.navigationType,
                id: metric.id,
            },
        });

        // Log poor metrics
        if (metric.rating === 'poor') {
            console.warn(`[Performance] Poor ${metric.name}:`, metric.value);
        }
    }

    /**
     * Track custom performance metric
     */
    trackMetric(name: string, value: number, metadata?: Record<string, any>): void {
        const metric: PerformanceMetric = {
            name,
            value,
            timestamp: Date.now(),
            metadata,
        };

        this.metrics.push(metric);

        // Keep only last N metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        this.sendToAnalytics(metric);
    }

    /**
     * Track API call performance
     */
    trackAPICall(
        endpoint: string,
        method: string,
        duration: number,
        status: number
    ): void {
        const metric: APIPerformanceMetric = {
            endpoint,
            method,
            duration,
            status,
            timestamp: Date.now(),
        };

        this.apiMetrics.push(metric);

        // Keep only last N metrics
        if (this.apiMetrics.length > this.maxMetrics) {
            this.apiMetrics.shift();
        }

        // Log slow API calls (> 1 second)
        if (duration > 1000) {
            console.warn(`[Performance] Slow API call: ${method} ${endpoint} (${duration}ms)`);
        }

        this.sendToAnalytics({
            name: 'api-call',
            value: duration,
            timestamp: Date.now(),
            metadata: { endpoint, method, status },
        });
    }

    /**
     * Get performance statistics
     */
    getStats(): {
        metrics: PerformanceMetric[];
        apiMetrics: APIPerformanceMetric[];
        averageAPITime: number;
        slowAPICallsCount: number;
    } {
        const totalAPITime = this.apiMetrics.reduce((sum, m) => sum + m.duration, 0);
        const averageAPITime = this.apiMetrics.length > 0
            ? totalAPITime / this.apiMetrics.length
            : 0;
        const slowAPICallsCount = this.apiMetrics.filter(m => m.duration > 1000).length;

        return {
            metrics: this.metrics,
            apiMetrics: this.apiMetrics,
            averageAPITime,
            slowAPICallsCount,
        };
    }

    /**
     * Send metric to analytics endpoint
     */
    private async sendToAnalytics(metric: PerformanceMetric): Promise<void> {
        // Only send in production
        if (process.env.NODE_ENV !== 'production') {
            return;
        }

        try {
            // Send to custom analytics endpoint
            await fetch('/api/analytics/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metric),
            });
        } catch (error) {
            // Silently fail - don't disrupt user experience
            console.error('[Performance] Failed to send metric:', error);
        }
    }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize Web Vitals tracking
 * Call this in your root layout or _app.tsx
 */
export function initWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Dynamically import web-vitals to avoid SSR issues
    import('web-vitals').then(({ onCLS, onFCP, onFID, onLCP, onTTFB, onINP }) => {
        onCLS((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
        onFCP((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
        onFID((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
        onLCP((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
        onTTFB((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
        onINP((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
    });
}

/**
 * Track page load performance
 */
export function trackPageLoad(pageName: string): void {
    if (typeof window === 'undefined') return;

    // Wait for page to fully load
    window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigation) {
            performanceMonitor.trackMetric('page-load', navigation.loadEventEnd - navigation.fetchStart, {
                page: pageName,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                domInteractive: navigation.domInteractive - navigation.fetchStart,
            });
        }
    });
}

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
): Promise<T> {
    const start = performance.now();

    try {
        const result = await fn();
        const duration = performance.now() - start;

        performanceMonitor.trackMetric(name, duration, metadata);

        return result;
    } catch (error) {
        const duration = performance.now() - start;
        performanceMonitor.trackMetric(name, duration, { ...metadata, error: true });
        throw error;
    }
}

/**
 * Measure synchronous function execution time
 */
export function measure<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
): T {
    const start = performance.now();

    try {
        const result = fn();
        const duration = performance.now() - start;

        performanceMonitor.trackMetric(name, duration, metadata);

        return result;
    } catch (error) {
        const duration = performance.now() - start;
        performanceMonitor.trackMetric(name, duration, { ...metadata, error: true });
        throw error;
    }
}

/**
 * API call wrapper with performance tracking
 */
export async function trackAPICall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const start = performance.now();
    const method = options.method || 'GET';

    try {
        const response = await fetch(endpoint, options);
        const duration = performance.now() - start;

        performanceMonitor.trackAPICall(endpoint, method, duration, response.status);

        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        const duration = performance.now() - start;
        performanceMonitor.trackAPICall(endpoint, method, duration, 0);
        throw error;
    }
}

/**
 * Get performance statistics
 */
export function getPerformanceStats() {
    return performanceMonitor.getStats();
}

/**
 * Performance mark utilities (for custom measurements)
 */
export const PerformanceMark = {
    start(name: string): void {
        if (typeof performance !== 'undefined') {
            performance.mark(`${name}-start`);
        }
    },

    end(name: string): number | null {
        if (typeof performance === 'undefined') return null;

        performance.mark(`${name}-end`);

        try {
            const measure = performance.measure(name, `${name}-start`, `${name}-end`);
            performanceMonitor.trackMetric(name, measure.duration);

            // Clean up marks
            performance.clearMarks(`${name}-start`);
            performance.clearMarks(`${name}-end`);
            performance.clearMeasures(name);

            return measure.duration;
        } catch (error) {
            console.error('[Performance] Failed to measure:', error);
            return null;
        }
    },
};

/**
 * Resource timing utilities
 */
export function getResourceTimings(): PerformanceResourceTiming[] {
    if (typeof performance === 'undefined') return [];
    return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
}

/**
 * Get slow resources (> 1 second)
 */
export function getSlowResources(): PerformanceResourceTiming[] {
    return getResourceTimings().filter(resource => resource.duration > 1000);
}

/**
 * Log performance summary to console
 */
export function logPerformanceSummary(): void {
    const stats = performanceMonitor.getStats();

    console.group('[Performance Summary]');
    console.log('Average API Time:', stats.averageAPITime.toFixed(2), 'ms');
    console.log('Slow API Calls:', stats.slowAPICallsCount);
    console.log('Total Metrics:', stats.metrics.length);
    console.log('Total API Calls:', stats.apiMetrics.length);

    const slowResources = getSlowResources();
    if (slowResources.length > 0) {
        console.warn('Slow Resources:', slowResources.length);
        slowResources.forEach(resource => {
            console.log(`  - ${resource.name}: ${resource.duration.toFixed(2)}ms`);
        });
    }

    console.groupEnd();
}

/**
 * Export performance monitor for direct access
 */
export { performanceMonitor };

/**
 * Example usage:
 * 
 * // In root layout:
 * import { initWebVitals } from '@/lib/performance-monitor';
 * 
 * useEffect(() => {
 *   initWebVitals();
 * }, []);
 * 
 * // Track page load:
 * import { trackPageLoad } from '@/lib/performance-monitor';
 * 
 * useEffect(() => {
 *   trackPageLoad('Dashboard');
 * }, []);
 * 
 * // Measure async operation:
 * import { measureAsync } from '@/lib/performance-monitor';
 * 
 * const data = await measureAsync('fetch-courses', async () => {
 *   return await fetchCourses();
 * });
 * 
 * // Track API call:
 * import { trackAPICall } from '@/lib/performance-monitor';
 * 
 * const courses = await trackAPICall('/api/courses');
 */
