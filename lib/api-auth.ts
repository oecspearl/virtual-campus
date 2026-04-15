import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { createClient, type User } from '@supabase/supabase-js';
import { ensureUserExists } from "@/lib/user-provisioning";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  userProfile?: UserProfile;
  error?: string;
  status?: number;
}

export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    let supabase;

    // Strategy 1: Bearer token in Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });
    } else {
      // Strategy 2: Cookie-based server client (works in most Next.js contexts)
      supabase = await createServerSupabaseClient();
    }

    // Get user from Supabase auth
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    // Strategy 3: If cookie-based client failed, try extracting token from request cookies directly
    if ((authError || !user) && !authHeader) {
      const cookieHeader = request.headers.get('cookie') || '';
      // Supabase stores the access token in a cookie like sb-<ref>-auth-token
      const tokenMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
      if (tokenMatch) {
        try {
          // The cookie value may be base64-encoded JSON with the access_token inside
          const decoded = decodeURIComponent(tokenMatch[1]);
          let accessToken = decoded;

          // Try parsing as JSON array (Supabase stores [base64_access, base64_refresh])
          // or as a JSON object with access_token field
          try {
            const parsed = JSON.parse(decoded);
            if (Array.isArray(parsed) && parsed[0]) {
              // Supabase SSR stores as JSON array: ["base64_access_token", "base64_refresh_token"]
              accessToken = parsed[0];
            } else if (parsed.access_token) {
              accessToken = parsed.access_token;
            }
          } catch {
            // Not JSON — use the raw value as the token
          }

          if (accessToken && accessToken.length > 20) {
            const tokenClient = createClient(supabaseUrl, supabaseAnonKey, {
              global: {
                headers: {
                  Authorization: `Bearer ${accessToken}`
                }
              }
            });
            const result = await tokenClient.auth.getUser();
            if (result.data.user) {
              user = result.data.user;
              authError = null;
              supabase = tokenClient;
            }
          }
        } catch {
          // Token extraction failed — fall through to auth failure
        }
      }
    }

    if (authError || !user) {
      console.error('API Auth: Authentication failed', authError?.message || 'No session');
      return {
        success: false,
        error: "Authentication required",
        status: 401
      };
    }

    // Verify user exists in our database, create if not
    const tenantId = request.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000001';
    const provisionResult = await ensureUserExists(
      user.id,
      user.email || '',
      user.user_metadata || {},
      tenantId,
    );

    if (provisionResult.success === false) {
      return {
        success: false,
        error: provisionResult.error,
        status: 500
      };
    }

    const userProfile = provisionResult.userProfile;

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

export async function authorizeUser(userProfile: UserProfile, requiredRoles?: string[]): Promise<AuthResult> {
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

/**
 * Create a safe error response that never leaks internal details to the client.
 * Logs the full error server-side for debugging.
 */
export function createSafeErrorResponse(
  userMessage: string,
  status: number,
  internalError?: unknown
): NextResponse {
  if (internalError) {
    console.error(`API Error [${status}]: ${userMessage}`, internalError);
  }
  return NextResponse.json({ error: userMessage }, { status });
}

/**
 * Verifies that a user has a membership in the target tenant.
 * Used to ensure tenant_admin can only access their own tenant.
 */
export async function verifyTenantOwnership(userId: string, targetTenantId: string): Promise<boolean> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data } = await serviceSupabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('tenant_id', targetTenantId)
    .single();
  return !!data;
}

// Re-export rate limiting from dedicated module
export {
  checkRateLimit,
  checkAuthProfileRateLimit,
  checkRateLimitWithMeta,
  getRateLimitHeaders,
  checkStrictRateLimit,
} from '@/lib/rate-limit';
