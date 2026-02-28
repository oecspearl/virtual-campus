/**
 * Cache Utilities for OECS LearnBoard
 * 
 * Provides in-memory caching with TTL support and cache invalidation strategies.
 * Optimized for serverless environments with automatic cleanup.
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
}

class CacheManager {
    private cache: Map<string, CacheEntry<any>>;
    private stats: { hits: number; misses: number };
    private cleanupInterval: NodeJS.Timeout | null;

    constructor() {
        this.cache = new Map();
        this.stats = { hits: 0, misses: 0 };
        this.cleanupInterval = null;

        // Start cleanup interval (runs every 5 minutes)
        if (typeof window === 'undefined') {
            this.startCleanup();
        }
    }

    /**
     * Get value from cache
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check if entry has expired
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        return entry.data as T;
    }

    /**
     * Set value in cache with TTL
     */
    set<T>(key: string, data: T, ttl: number = 300000): void {
        // Default TTL: 5 minutes (300000ms)
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    /**
     * Delete specific cache entry
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Delete all cache entries matching a pattern
     */
    deletePattern(pattern: string): number {
        let count = 0;
        const regex = new RegExp(pattern);

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }

        return count;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0 };
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            size: this.cache.size,
            hitRate: total > 0 ? this.stats.hits / total : 0,
        };
    }

    /**
     * Start automatic cleanup of expired entries
     */
    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 300000); // Run every 5 minutes
    }

    /**
     * Clean up expired cache entries
     */
    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
        }
    }

    /**
     * Stop cleanup interval (for cleanup)
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// Singleton instance
const cacheManager = new CacheManager();

/**
 * Cache key generation utilities
 */
export const CacheKeys = {
    courses: {
        list: (filters?: Record<string, any>) =>
            `courses:list:${JSON.stringify(filters || {})}`,
        detail: (id: string) => `courses:detail:${id}`,
        featured: () => 'courses:featured',
        bySubject: (subject: string) => `courses:subject:${subject}`,
    },

    enrollments: {
        byStudent: (studentId: string) => `enrollments:student:${studentId}`,
        byCourse: (courseId: string) => `enrollments:course:${courseId}`,
        detail: (studentId: string, courseId: string) =>
            `enrollments:${studentId}:${courseId}`,
    },

    lessons: {
        byCourse: (courseId: string) => `lessons:course:${courseId}`,
        bySubject: (subjectId: string) => `lessons:subject:${subjectId}`,
        detail: (id: string) => `lessons:detail:${id}`,
    },

    progress: {
        byStudent: (studentId: string) => `progress:student:${studentId}`,
        byLesson: (lessonId: string) => `progress:lesson:${lessonId}`,
        detail: (studentId: string, lessonId: string) =>
            `progress:${studentId}:${lessonId}`,
    },

    grades: {
        byCourse: (courseId: string, studentId: string) =>
            `grades:${courseId}:${studentId}`,
        byStudent: (studentId: string) => `grades:student:${studentId}`,
    },

    analytics: {
        dashboard: (userId: string, dateRange: string) =>
            `analytics:dashboard:${userId}:${dateRange}`,
        courseStats: (courseId: string) => `analytics:course:${courseId}`,
    },
};

/**
 * Cache invalidation strategies
 */
export const CacheInvalidation = {
    /**
     * Invalidate all course-related caches
     */
    courses: (courseId?: string) => {
        if (courseId) {
            cacheManager.delete(CacheKeys.courses.detail(courseId));
            cacheManager.deletePattern(`lessons:course:${courseId}`);
            cacheManager.deletePattern(`enrollments:course:${courseId}`);
        }
        cacheManager.deletePattern('courses:list:');
        cacheManager.delete(CacheKeys.courses.featured());
    },

    /**
     * Invalidate enrollment caches
     */
    enrollments: (studentId?: string, courseId?: string) => {
        if (studentId) {
            cacheManager.delete(CacheKeys.enrollments.byStudent(studentId));
            cacheManager.deletePattern(`progress:student:${studentId}`);
        }
        if (courseId) {
            cacheManager.delete(CacheKeys.enrollments.byCourse(courseId));
        }
        if (studentId && courseId) {
            cacheManager.delete(CacheKeys.enrollments.detail(studentId, courseId));
        }
    },

    /**
     * Invalidate lesson caches
     */
    lessons: (lessonId?: string, courseId?: string) => {
        if (lessonId) {
            cacheManager.delete(CacheKeys.lessons.detail(lessonId));
            cacheManager.deletePattern(`progress:.*:${lessonId}`);
        }
        if (courseId) {
            cacheManager.delete(CacheKeys.lessons.byCourse(courseId));
        }
    },

    /**
     * Invalidate progress caches
     */
    progress: (studentId?: string, lessonId?: string) => {
        if (studentId && lessonId) {
            cacheManager.delete(CacheKeys.progress.detail(studentId, lessonId));
        }
        if (studentId) {
            cacheManager.delete(CacheKeys.progress.byStudent(studentId));
        }
        if (lessonId) {
            cacheManager.delete(CacheKeys.progress.byLesson(lessonId));
        }
    },

    /**
     * Invalidate grade caches
     */
    grades: (studentId?: string, courseId?: string) => {
        if (studentId && courseId) {
            cacheManager.delete(CacheKeys.grades.byCourse(courseId, studentId));
        }
        if (studentId) {
            cacheManager.delete(CacheKeys.grades.byStudent(studentId));
        }
    },

    /**
     * Invalidate all analytics caches
     */
    analytics: () => {
        cacheManager.deletePattern('analytics:');
    },
};

/**
 * Wrapper function for cached API calls
 */
export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300000
): Promise<T> {
    // Try to get from cache
    const cached = cacheManager.get<T>(key);
    if (cached !== null) {
        return cached;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in cache
    cacheManager.set(key, data, ttl);

    return data;
}

/**
 * Export cache manager for direct access
 */
export { cacheManager };

/**
 * Cache TTL constants (in milliseconds)
 */
export const CacheTTL = {
    SHORT: 60000,      // 1 minute
    MEDIUM: 300000,    // 5 minutes
    LONG: 900000,      // 15 minutes
    VERY_LONG: 3600000, // 1 hour
};

/**
 * Example usage:
 * 
 * // In API route:
 * import { withCache, CacheKeys, CacheTTL, CacheInvalidation } from '@/lib/cache-utils';
 * 
 * // GET request with caching
 * export async function GET(request: Request) {
 *   const courses = await withCache(
 *     CacheKeys.courses.list(),
 *     async () => {
 *       const { data } = await supabase.from('courses').select('*');
 *       return data;
 *     },
 *     CacheTTL.MEDIUM
 *   );
 *   return Response.json(courses);
 * }
 * 
 * // POST request with cache invalidation
 * export async function POST(request: Request) {
 *   const newCourse = await request.json();
 *   const { data } = await supabase.from('courses').insert(newCourse);
 *   
 *   // Invalidate course caches
 *   CacheInvalidation.courses();
 *   
 *   return Response.json(data);
 * }
 */
