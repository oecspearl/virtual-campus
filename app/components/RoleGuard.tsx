'use client';

import React, { useState, useEffect } from 'react';

interface RoleGuardProps {
  roles?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Cache for role data to reduce API calls
let roleCache: { role: string | null; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds

export default function RoleGuard({ roles = [], children, fallback = null }: RoleGuardProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      // Check cache first
      const now = Date.now();
      if (roleCache && (now - roleCache.timestamp) < CACHE_DURATION) {
        setUserRole(roleCache.role);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/profile', { cache: 'no-store' });
        if (response.ok) {
          const profile = await response.json();
          const role = profile?.role || 'student';
          setUserRole(role);
          // Update cache
          roleCache = { role, timestamp: now };
        } else {
          const role = 'student';
          setUserRole(role);
          roleCache = { role, timestamp: now };
        }
      } catch (error) {
        console.error('RoleGuard: Error fetching user role:', error);
        const role = 'student';
        setUserRole(role);
        roleCache = { role, timestamp: now };
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  // Show loading state while checking role
  if (loading) {
    return null;
  }

  // Check if user has one of the required roles
  const hasAccess = userRole && roles && Array.isArray(roles) && roles.length > 0 && roles.includes(userRole);
  
  // Only log access denials for debugging, not normal student access patterns
  // Optional debug:
  // if (!hasAccess && roles && roles.length > 0 && !roles.includes('student')) {
  //   console.debug('RoleGuard: Access denied for role:', userRole, 'required:', roles);
  // }
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}