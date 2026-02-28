import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { createClient } from '@supabase/supabase-js';

interface AuthResult {
  success: boolean;
  user?: any;
  userProfile?: any;
  error?: string;
  status?: number;
}

export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    // For API routes, we need to get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    let supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // If we have a Bearer token, use it
      const token = authHeader.substring(7);
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });
    } else {
      // Fallback to server client with cookies
      supabase = await createServerSupabaseClient();
    }
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('API Auth: Authentication failed', authError);
      return {
        success: false,
        error: "Authentication required",
        status: 401
      };
    }

    // Verify user exists in our database, create if not
    // Use service client to bypass RLS on users table (prevents infinite recursion)
    const serviceSupabase = createServiceSupabaseClient();
    let { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('id, email, name, role, created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.log('API Auth: User profile not found, creating new user...', profileError);

      // Resolve tenant from request headers (set by middleware)
      const tenantId = request.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000001';

      // Create user in our database
      const newUser = {
        id: user.id,
        email: user.email || '',
        name: (user.user_metadata?.full_name || user.user_metadata?.name || '') as string,
        role: 'student', // Default role
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdUser, error: createError } = await serviceSupabase
        .from('users')
        .insert([newUser])
        .select('id, email, name, role, created_at, updated_at')
        .single();

      if (createError) {
        console.error('API Auth: Failed to create user', createError);
        return {
          success: false,
          error: "Failed to create user profile",
          status: 500
        };
      }

      // Create tenant membership for the new user
      await serviceSupabase
        .from('tenant_memberships')
        .insert([{
          tenant_id: tenantId,
          user_id: user.id,
          role: 'student',
          is_primary: true,
        }]);

      userProfile = createdUser;
      console.log('API Auth: User created with tenant membership', userProfile);
    }

    return {
      success: true,
      user,
      userProfile
    };

  } catch (error) {
    console.error('API Auth: Unexpected error', error);
    return {
      success: false,
      error: "Internal server error",
      status: 500
    };
  }
}

export async function authorizeUser(userProfile: any, requiredRoles?: string[]): Promise<AuthResult> {
  if (!requiredRoles || requiredRoles.length === 0) {
    return { success: true, userProfile };
  }

  if (!userProfile.role || !requiredRoles.includes(userProfile.role)) {
    console.error('API Auth: Insufficient permissions', {
      userRole: userProfile.role,
      requiredRoles
    });
    return {
      success: false,
      error: "Insufficient permissions",
      status: 403
    };
  }

  return { success: true, userProfile };
}

export function createAuthResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// Rate limiting (improved for serverless environments)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  // Clean up expired records periodically
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// More lenient rate limiting for auth profile endpoint
export function checkAuthProfileRateLimit(identifier: string): boolean {
  // Allow 200 requests per minute for auth profile (very lenient since RoleGuard calls this frequently)
  return checkRateLimit(identifier, 200, 60000);
}

export function getRateLimitHeaders(identifier: string, limit: number = 10, windowMs: number = 60000) {
  const record = rateLimitStore.get(identifier);
  const remaining = record ? Math.max(0, limit - record.count) : limit;
  const resetTime = record ? record.resetTime : Date.now() + windowMs;
  
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
  };
}
