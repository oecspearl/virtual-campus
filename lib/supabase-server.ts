import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
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
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    })
  } catch (error) {
    // Fallback to basic client if cookies are not available
    return createClient(supabaseUrl, supabaseAnonKey)
  }
}

// Service role client that bypasses RLS policies
export function createServiceSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
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
