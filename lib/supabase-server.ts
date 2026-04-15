import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = 'FATAL: Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
  console.error(msg)
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg)
  }
}

// Server-side Supabase client for API routes and middleware
export async function createServerSupabaseClient() {
  try {
    const cookieStore = await cookies()

    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Cookie setting can fail in certain contexts (e.g. after response started)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Cookie removal can fail in certain contexts
          }
        },
      },
    })
  } catch (error) {
    // cookies() threw — likely called outside a request context.
    // Return an unauthenticated client; callers must handle auth failures.
    console.warn('createServerSupabaseClient: cookies() unavailable, returning unauthenticated client')
    return createClient(supabaseUrl, supabaseAnonKey)
  }
}

// Service role client that bypasses RLS policies.
// Uses the connection pooler URL if available for better serverless performance.
export function createServiceSupabaseClient() {
  const poolerUrl = process.env.SUPABASE_POOLER_URL;
  return createClient(poolerUrl || supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      // Use the transaction pooler schema if available
      schema: 'public',
    },
  })
}

// Tenant-aware server client that sets the Postgres session variable
// for RLS policies to use via current_tenant_id()
export async function createTenantServerSupabaseClient(tenantId: string) {
  const client = await createServerSupabaseClient()
  // Set the tenant context for RLS policies
  await client.rpc('set_tenant_context', { p_tenant_id: tenantId })
  return client
}
