import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Single per-browser-tab Supabase client. Lazy-initialized on first call.
 *
 * Browser code MUST go through this getter (or `useSupabase().supabase`
 * from the provider) — never `createClient` from `@supabase/supabase-js`
 * directly, never a fresh `createBrowserClient` call. Multiple GoTrue
 * clients sharing the same storage key produce a console warning at
 * best, and undefined auth-refresh behavior at worst.
 *
 * `createBrowserClient` is intentionally not exported; it stays a
 * private factory so a future caller can't accidentally bypass the
 * singleton.
 */
// Private factory — wrapped so the return type stays concrete (the
// generic form of createBrowserClient resolves to `never` for tables
// when no <Database> type parameter is supplied).
function _newBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

let supabaseInstance: ReturnType<typeof _newBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = _newBrowserClient();
  }
  return supabaseInstance;
}

// Re-export the generated Database type so callers can opt into typed
// access via `createClient<Database>(url, key)` at individual call sites.
// The default clients above are intentionally untyped — wiring the
// generic into them surfaces a long tail of pre-existing type-strict
// issues that need their own cleanup pass.
export type { Database, Json } from './database.types';
