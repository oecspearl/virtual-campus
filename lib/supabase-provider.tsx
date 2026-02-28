'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getSupabaseClient } from './supabase'
import type { User } from '@supabase/supabase-js'

interface SupabaseContextType {
  user: User | null
  loading: boolean
  supabase: ReturnType<typeof getSupabaseClient>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  createUserProfile: (userData: { id: string; email: string; name: string; role: string }) => Promise<{ data: any; error: any }>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Use the shared supabase instance
  const supabaseInstance = getSupabaseClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabaseInstance.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabaseInstance.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabaseInstance.auth.signOut()
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    return await supabaseInstance.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
  }

  const signIn = async (email: string, password: string) => {
    return await supabaseInstance.auth.signInWithPassword({
      email,
      password
    })
  }

  const createUserProfile = async (userData: { id: string; email: string; name: string; role: string }) => {
    return await supabaseInstance
      .from('users')
      .insert([userData])
  }

  return (
    <SupabaseContext.Provider value={{ user, loading, supabase: supabaseInstance, signOut, signUp, signIn, createUserProfile }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
