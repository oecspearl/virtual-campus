'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import LoadingIndicator from '@/app/components/ui/LoadingIndicator'

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          setError(error.message)
        } else {
          setUser(user)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleSignIn = async () => {
    router.push('/auth/signin')
  }

  if (loading) {
    return <div className="p-8"><LoadingIndicator variant="dots" size="sm" text="Loading..." /></div>
  }

  return (
    <div className="min-h-screen bg-oecs-light">
      <div className="container-custom section-padding">
        <h1 className="text-section-title mb-8">Authentication Test</h1>
        
        <div className="card max-w-2xl">
          <h2 className="text-card-title mb-4">Current Authentication Status</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-800"><strong>Error:</strong> {error}</p>
            </div>
          )}
          
          {user ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800"><strong>✅ Authenticated</strong></p>
                <p className="text-sm text-green-700">User ID: {user.id}</p>
                <p className="text-sm text-green-700">Email: {user.email}</p>
                <p className="text-sm text-green-700">Name: {user.user_metadata?.full_name || 'Not set'}</p>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={handleSignOut}
                  className="btn-secondary"
                >
                  Sign Out
                </button>
                <button 
                  onClick={() => router.push('/courses')}
                  className="btn-primary"
                >
                  Test Courses Page
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-yellow-800"><strong>⚠️ Not Authenticated</strong></p>
                <p className="text-sm text-yellow-700">You need to sign in to access protected pages.</p>
              </div>
              
              <button 
                onClick={handleSignIn}
                className="btn-primary"
              >
                Go to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}





























