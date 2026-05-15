/**
 * Cache control helpers for API route responses.
 * Use these to add appropriate caching to GET responses.
 *
 * Pick PRIVATE_* for anything that includes per-user, per-role, or
 * per-tenant data — those responses must never be shared across users
 * by a CDN. Pick the public CACHE_* values only for genuinely
 * anonymous, identical-for-everyone responses (categories, public
 * help content, public site settings).
 */

/** No caching — real-time data (grades, progress, enrollment status) */
export const CACHE_NONE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

/** Browser-only short cache (30s). Safe for personalized endpoints — the CDN won't share it. */
export const PRIVATE_SHORT = {
  'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
};

/** Browser-only medium cache (2min). Personalized list endpoints — student dashboards, "my courses", etc. */
export const PRIVATE_MEDIUM = {
  'Cache-Control': 'private, max-age=120, stale-while-revalidate=300',
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
