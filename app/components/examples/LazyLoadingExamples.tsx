/**
 * Example: Lazy Loading Components
 * 
 * This file demonstrates how to implement lazy loading for heavy components
 * to improve initial page load performance.
 */

'use client';

import React, { Suspense, lazy } from 'react';
import {
    CourseCardSkeleton,
    DashboardSkeleton,
    QuizSkeleton,
    GradebookSkeleton
} from '@/app/components/LoadingSkeleton';

// Lazy load heavy components
const VideoPlayer = lazy(() => import('@/app/components/VideoPlayer'));
// @ts-expect-error - module may not exist yet
const RichTextEditor = lazy(() => import('@/app/components/RichTextEditor'));
const CodeSandbox = lazy(() => import('@/app/components/CodeSandbox'));
// @ts-expect-error - module may not exist yet
const ChartComponent = lazy(() => import('@/app/components/ChartComponent'));
// @ts-expect-error - module may not exist yet
const PDFViewer = lazy(() => import('@/app/components/PDFViewer'));

/**
 * Example 1: Lazy load video player
 */
export function LazyVideoPlayer({ videoUrl }: { videoUrl: string }) {
    return (
        <Suspense fallback={<div className="h-64 bg-gray-200 animate-pulse rounded" />}>
            <VideoPlayer src={videoUrl} />
        </Suspense>
    );
}

/**
 * Example 2: Lazy load rich text editor
 */
export function LazyEditor({ initialContent, onChange }: any) {
    return (
        <Suspense fallback={<div className="h-96 bg-gray-200 animate-pulse rounded" />}>
            <RichTextEditor initialContent={initialContent} onChange={onChange} />
        </Suspense>
    );
}

/**
 * Example 3: Lazy load code sandbox
 */
export function LazyCodeSandbox({ code, language }: any) {
    return (
        <Suspense fallback={<div className="h-96 bg-gray-900 animate-pulse rounded" />}>
            <CodeSandbox initialCode={code} language={language} />
        </Suspense>
    );
}

/**
 * Example 4: Lazy load charts
 */
export function LazyChart({ data, type }: any) {
    return (
        <Suspense fallback={<div className="h-64 bg-gray-200 animate-pulse rounded" />}>
            <ChartComponent data={data} type={type} />
        </Suspense>
    );
}

/**
 * Example 5: Lazy load PDF viewer
 */
export function LazyPDFViewer({ pdfUrl }: { pdfUrl: string }) {
    return (
        <Suspense fallback={<div className="h-screen bg-gray-200 animate-pulse rounded" />}>
            <PDFViewer url={pdfUrl} />
        </Suspense>
    );
}

/**
 * Example 6: Route-based code splitting
 * 
 * In your page files, use dynamic imports:
 * 
 * import dynamic from 'next/dynamic';
 * 
 * const DashboardContent = dynamic(() => import('@/app/components/DashboardContent'), {
 *   loading: () => <DashboardSkeleton />,
 *   ssr: false, // Disable SSR for client-only components
 * });
 * 
 * export default function DashboardPage() {
 *   return <DashboardContent />;
 * }
 */

/**
 * Example 7: Conditional lazy loading
 * 
 * Only load components when needed:
 */
export function ConditionalLazyLoad({ showAdvanced }: { showAdvanced: boolean }) {
    // @ts-expect-error - module may not exist yet
    const AdvancedFeatures = lazy(() => import('@/app/components/AdvancedFeatures'));

    return (
        <div>
            <h2>Basic Features</h2>
            {/* Basic content always loaded */}

            {showAdvanced && (
                <Suspense fallback={<div>Loading advanced features...</div>}>
                    <AdvancedFeatures />
                </Suspense>
            )}
        </div>
    );
}

/**
 * Example 8: Intersection Observer for lazy loading
 * 
 * Load components when they come into view:
 */
export function LazyLoadOnView() {
    const [isVisible, setIsVisible] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

    // @ts-expect-error - module may not exist yet
    const HeavyComponent = lazy(() => import('@/app/components/HeavyComponent'));

    return (
        <div ref={ref}>
            {isVisible ? (
                <Suspense fallback={<div>Loading...</div>}>
                    <HeavyComponent />
                </Suspense>
            ) : (
                <div className="h-64 bg-gray-200" />
            )}
        </div>
    );
}

/**
 * Best Practices:
 * 
 * 1. Lazy load components that are:
 *    - Large in size (> 50KB)
 *    - Not immediately visible
 *    - Used conditionally
 *    - Heavy on dependencies
 * 
 * 2. Always provide meaningful loading states
 * 
 * 3. Use skeleton screens instead of spinners
 * 
 * 4. Preload critical components on hover/focus
 * 
 * 5. Monitor bundle sizes with:
 *    npm run build
 *    npm run analyze
 */
