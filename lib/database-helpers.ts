import { createServerSupabaseClient, createServiceSupabaseClient } from './supabase-server'

// Helper function to get the current user
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Use service client to bypass RLS (same pattern as middleware and API auth)
  const serviceSupabase = createServiceSupabaseClient()
  const { data: profile } = await serviceSupabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile ? { ...user, ...profile } : user
}
