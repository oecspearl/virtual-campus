/**
 * Cache control helpers for API route responses.
 * Use these to add appropriate caching to GET responses.
 */

/** No caching — real-time data (grades, progress, enrollment status) */
export const CACHE_NONE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

/** Short cache — data that changes frequently but can tolerate 30s staleness (course details, user profiles) */
export const CACHE_SHORT = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
};

/** Medium cache — data that changes occasionally (course listings, lesson content) */
export const CACHE_MEDIUM = {
  'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
};

/** Long cache — data that rarely changes (help content, site settings, categories) */
export const CACHE_LONG = {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
};
