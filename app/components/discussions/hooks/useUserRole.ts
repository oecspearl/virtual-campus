'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase-provider';

export type UserRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'admin'
  | 'instructor'
  | 'curriculum_designer'
  | 'student'
  | 'parent';

const INSTRUCTOR_ROLES: UserRole[] = [
  'admin',
  'super_admin',
  'instructor',
  'curriculum_designer',
];

export interface UseUserRoleResult {
  role: UserRole | null;
  isInstructor: boolean;
}

/**
 * Resolves the current user's role by calling /api/auth/profile with the
 * active Supabase session token, falling back to `user.user_metadata.role`
 * (or 'student') if the profile call fails or there's no session.
 *
 * Returns both the raw role and an `isInstructor` convenience flag that
 * matches the server-side role check used across the discussion routes.
 */
export function useUserRole(): UseUserRoleResult {
  const { user, supabase } = useSupabase();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchUserProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('/api/auth/profile', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const profile = await res.json();
            setRole((profile?.role as UserRole) || 'student');
            return;
          }
        }
        setRole((user.user_metadata?.role as UserRole) || 'student');
      } catch (err) {
        console.error('Error fetching profile:', err);
        setRole((user.user_metadata?.role as UserRole) || 'student');
      }
    };
    fetchUserProfile();
  }, [user, supabase]);

  return {
    role,
    isInstructor: !!role && INSTRUCTOR_ROLES.includes(role),
  };
}
