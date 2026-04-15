/**
 * Loading Skeleton Components
 * 
 * Reusable skeleton loaders for better perceived performance
 */

import React from 'react';

interface SkeletonProps {
    className?: string;
}

/**
 * Base skeleton component
 */
export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
            aria-hidden="true"
        />
    );
}

/**
 * Course card skeleton
 */
export function CourseCardSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Thumbnail */}
            <Skeleton className="h-48 w-full" />

            <div className="p-4 space-y-3">
                {/* Title */}
                <Skeleton className="h-6 w-3/4" />

                {/* Description */}
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />

                {/* Metadata */}
                <div className="flex gap-2 mt-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                </div>

                {/* Button */}
                <Skeleton className="h-10 w-full mt-4" />
            </div>
        </div>
    );
}

/**
 * Lesson list skeleton
 */
export function LessonListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                    <div className="flex items-center gap-4">
                        {/* Icon */}
                        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />

                        <div className="flex-1 space-y-2">
                            {/* Title */}
                            <Skeleton className="h-5 w-2/3" />

                            {/* Description */}
                            <Skeleton className="h-4 w-1/2" />
                        </div>

                        {/* Status */}
                        <Skeleton className="h-8 w-24 flex-shrink-0" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Dashboard skeleton
 */
export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <Skeleton className="h-6 w-40" />
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-4 flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Gradebook skeleton
 */
export function GradebookSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Skeleton className="h-6 w-48" />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="p-3">
                                <Skeleton className="h-4 w-24" />
                            </th>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <th key={i} className="p-3">
                                    <Skeleton className="h-4 w-20" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <tr key={i}>
                                <td className="p-3">
                                    <Skeleton className="h-4 w-32" />
                                </td>
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <td key={j} className="p-3">
                                        <Skeleton className="h-4 w-12" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * Profile skeleton
 */
export function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                </div>
            </div>

            {/* Content sections */}
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                </div>
            ))}
        </div>
    );
}

/**
 * Quiz skeleton
 */
export function QuizSkeleton() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <Skeleton className="h-8 w-64 mb-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Questions */}
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-5 w-full" />
                    </div>

                    {/* Options */}
                    <div className="space-y-2 ml-8">
                        {Array.from({ length: 4 }).map((_, j) => (
                            <Skeleton key={j} className="h-10 w-full" />
                        ))}
                    </div>
                </div>
            ))}

            {/* Submit button */}
            <Skeleton className="h-12 w-full" />
        </div>
    );
}

/**
 * Text skeleton (for loading text content)
 */
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
                />
            ))}
        </div>
    );
}

/**
 * Card skeleton (generic)
 */
export function CardSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <TextSkeleton lines={3} />
            <Skeleton className="h-10 w-full" />
        </div>
    );
}

/**
 * Table skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="p-3">
                                <Skeleton className="h-4 w-20" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {Array.from({ length: rows }).map((_, i) => (
                        <tr key={i}>
                            {Array.from({ length: columns }).map((_, j) => (
                                <td key={j} className="p-3">
                                    <Skeleton className="h-4 w-24" />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
