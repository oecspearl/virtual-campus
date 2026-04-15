'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/lib/supabase-provider'
import Link from 'next/link'

interface OAuthProviderPublic {
  provider_type: string
  display_name: string
  button_label: string | null
  button_icon: string | null
}

const OAUTH_ICONS: Record<string, string> = {
  azure_ad: '/icons/microsoft.svg',
  google: '/icons/google.svg',
  generic_oidc: '',
}

const OAUTH_LABELS: Record<string, string> = {
  azure_ad: 'Sign in with Microsoft',
  google: 'Sign in with Google',
  generic_oidc: 'Sign in with SSO',
}

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ssoEnabled, setSsoEnabled] = useState(false)
  const [oauthProviders, setOauthProviders] = useState<OAuthProviderPublic[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, createUserProfile } = useSupabase()

  // Show OAuth callback errors
  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError) {
      const errorMessages: Record<string, string> = {
        missing_provider: 'No authentication provider specified.',
        provider_not_found: 'Authentication provider is not available.',
        invalid_state: 'Authentication session expired. Please try again.',
        missing_verifier: 'Authentication session expired. Please try again.',
        no_email: 'No email address was provided by the identity provider.',
        email_domain_not_allowed: 'Your email domain is not allowed for this organization.',
        session_failed: 'Failed to create your session. Please try again.',
        oauth_callback_failed: 'Authentication failed. Please try again.',
        oauth_error: 'An error occurred during authentication.',
        too_many_requests: 'Too many sign-in attempts. Please wait a moment and try again.',
      }
      setError(errorMessages[oauthError] || oauthError)
    }
  }, [searchParams])

  // Check if SonisWeb SSO and OAuth providers are configured for this tenant
  useEffect(() => {
    fetch('/api/sonisweb/auth/validate', { method: 'OPTIONS' })
      .catch(() => {})
    // Check for SSO connection by attempting a lightweight check
    fetch('/api/tenant/current')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.sonisweb_sso_enabled) {
          setSsoEnabled(true)
        }
      })
      .catch(() => {})

    // Fetch enabled OAuth providers for this tenant
    fetch('/api/auth/oauth/providers')
      .then(res => res.ok ? res.json() : [])
      .then((providers: OAuthProviderPublic[]) => {
        if (Array.isArray(providers) && providers.length > 0) {
          setOauthProviders(providers)
        }
      })
      .catch(() => {})
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // If SSO passthrough is enabled, try SonisWeb validation first
      if (ssoEnabled) {
        try {
          const ssoRes = await fetch('/api/sonisweb/auth/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })

          if (ssoRes.ok) {
            const ssoData = await ssoRes.json()
            if (ssoData.success) {
              // SSO validated — now sign in via Supabase with the same credentials
              // The user was auto-created/found by the validate endpoint
              const { data, error: signInError } = await signIn(email, password)
              if (!signInError && data.user) {
                router.push('/dashboard')
                return
              }
              // If Supabase sign-in fails after SSO validation, fall through to normal flow
            }
          }
          // If SSO validation fails, fall through to normal Supabase auth
        } catch (ssoErr) {
          console.error('SSO validation error, falling back to standard auth:', ssoErr)
        }
      }

      const { data, error } = await signIn(email, password)

      if (error) {
        setError(error.message)
      } else if (data.user) {
        // Check if user profile exists, create if not
        try {
          const response = await fetch('/api/auth/profile')
          if (!response.ok) {
            // Profile doesn't exist, create it
            const { error: profileError } = await createUserProfile({
              id: data.user.id,
              email: data.user.email!,
              name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
              role: data.user.user_metadata?.role || 'student'
            })

            if (profileError) {
              console.error('Failed to create user profile:', profileError)
              // Continue anyway - the user can still access the app
            }
          }
        } catch (profileError) {
          console.error('Error checking/creating profile:', profileError)
          // Continue anyway - the user can still access the app
        }

        router.push('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}>
            <img
              src="/oecs-logo.png"
              alt="OECS Logo"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
              }}
            />
            <span className="text-2xl font-bold hidden" style={{ color: 'var(--theme-primary)' }}>OECS</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to OECS Virtual Campus
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/signup" className="font-medium hover:opacity-80" style={{ color: 'var(--theme-primary)' }}>
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:z-10 sm:text-sm"
                style={{ '--tw-ring-color': 'var(--theme-primary)' } as React.CSSProperties & { '--tw-ring-color': string }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:z-10 sm:text-sm"
                style={{ '--tw-ring-color': 'var(--theme-primary)' } as React.CSSProperties & { '--tw-ring-color': string }}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 hover:brightness-90 cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
                '--tw-ring-color': 'var(--theme-primary)'
              } as React.CSSProperties & { '--tw-ring-color': string }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        {/* OAuth provider buttons */}
        {oauthProviders.length > 0 && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {oauthProviders.map((provider) => (
                <a
                  key={provider.provider_type}
                  href={`/api/auth/oauth/authorize?provider=${provider.provider_type}`}
                  className="group relative w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {provider.provider_type === 'azure_ad' && (
                    <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                    </svg>
                  )}
                  {provider.provider_type === 'google' && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {provider.provider_type === 'generic_oidc' && (
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25z" />
                    </svg>
                  )}
                  {provider.button_label || OAUTH_LABELS[provider.provider_type] || `Sign in with ${provider.display_name}`}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
