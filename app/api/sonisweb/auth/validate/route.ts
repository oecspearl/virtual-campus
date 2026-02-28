import { NextRequest, NextResponse } from 'next/server';
import { validateSonisWebCredentials, findOrCreateSSOUser, getSSOConnection } from '@/lib/sonisweb/auth';

/**
 * POST /api/sonisweb/auth/validate
 *
 * Unauthenticated endpoint for SSO passthrough.
 * Validates credentials against SonisWeb, then creates/retrieves a Supabase session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Resolve tenant from request headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000001';

    // Check if tenant has SSO connection
    const ssoConnection = await getSSOConnection(tenantId);
    if (!ssoConnection) {
      return NextResponse.json(
        { error: 'SSO is not configured for this institution' },
        { status: 404 }
      );
    }

    // Validate against SonisWeb
    const validation = await validateSonisWebCredentials(email, password, tenantId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Find or create LMS user (JIT provisioning)
    const { userId } = await findOrCreateSSOUser(
      email,
      validation.studentData || {},
      validation.soniswebId || email,
      tenantId,
      ssoConnection.id
    );

    // SonisWeb validation succeeded — return success
    // The client-side signin page will follow up with a standard Supabase signInWithPassword
    // since the user was created/found with a known password in the LMS
    return NextResponse.json({
      success: true,
      user_id: userId,
    });
  } catch (error: any) {
    console.error('SonisWeb auth validate error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
