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

// Database types (you can generate these with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'super_admin' | 'admin' | 'instructor' | 'curriculum_designer' | 'student' | 'parent'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'super_admin' | 'admin' | 'instructor' | 'curriculum_designer' | 'student' | 'parent'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'super_admin' | 'admin' | 'instructor' | 'curriculum_designer' | 'student' | 'parent'
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          thumbnail: string | null
          grade_level: string | null
          subject_area: string | null
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          syllabus: string | null
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          thumbnail?: string | null
          grade_level?: string | null
          subject_area?: string | null
          difficulty?: 'beginner' | 'intermediate' | 'advanced'
          syllabus?: string | null
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          thumbnail?: string | null
          grade_level?: string | null
          subject_area?: string | null
          difficulty?: 'beginner' | 'intermediate' | 'advanced'
          syllabus?: string | null
          published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // Add more table types as needed...
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
