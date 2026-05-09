import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client for browser
export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Create a single instance to avoid multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createBrowserSupabaseClient> | null = null

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserSupabaseClient()
  }
  return supabaseInstance
}

// For backward compatibility, export the client
export const supabase = getSupabaseClient()

// Re-export the generated Database type so callers can opt into typed
// access via `createClient<Database>(url, key)` at individual call sites.
// The default clients above are intentionally untyped — wiring the
// generic into them surfaces a long tail of pre-existing type-strict
// issues that need their own cleanup pass.
export type { Database, Json } from './database.types'
