/**
 * LTI Tool Authentication
 * Creates Supabase session and redirects to course/dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const sessionToken = searchParams.get('token');
    const contextId = searchParams.get('context_id');
    const returnUrl = searchParams.get('return_url');

    if (!userId || !sessionToken) {
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>Authentication Error</title></head><body><h1>Error</h1><p>Missing required parameters</p></body></html>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Verify session token
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: launch } = await tq.from('lti_tool_launches')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!launch) {
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>Authentication Error</title></head><body><h1>Error</h1><p>Invalid or expired session</p></body></html>',
        {
          status: 401,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Get user
    const { data: user } = await tq.from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user || !user.email) {
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>Authentication Error</title></head><body><h1>Error</h1><p>User not found</p></body></html>',
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Create a session using Supabase Admin API
    // Generate a magic link that will create a session
    const { data: sessionData, error: sessionError } = await tq.raw.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: `${request.nextUrl.origin}/api/lti/tool/callback`,
      },
    });

    if (sessionError || !sessionData) {
      console.error('[LTI Tool Auth] Error generating session:', sessionError);
      // Fallback: redirect to sign-in with a special parameter
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('lti_launch', 'true');
      signInUrl.searchParams.set('email', user.email);
      return NextResponse.redirect(signInUrl);
    }

    // Determine redirect URL
    let redirectPath = '/dashboard';
    
    if (contextId) {
      // Try to find course by context_id or create mapping
      const { data: course } = await tq.from('courses')
        .select('id')
        .eq('id', contextId)
        .single();

      if (course) {
        redirectPath = `/courses/${course.id}`;
      } else {
        // Could create a course mapping table in the future
        // For now, redirect to dashboard
        redirectPath = '/dashboard';
      }
    }

    // Store redirect path in launch record
    await tq.from('lti_tool_launches')
      .update({ redirect_url: redirectPath })
      .eq('session_token', sessionToken);

    // Redirect to magic link which will create the session
    if (sessionData.properties?.action_link) {
      return NextResponse.redirect(sessionData.properties.action_link);
    }

    // Fallback: redirect to dashboard
    return NextResponse.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    console.error('[LTI Tool Auth] Error:', error);
    return new NextResponse(
      '<!DOCTYPE html><html><head><title>Authentication Error</title></head><body><h1>Error</h1><p>Failed to authenticate</p></body></html>',
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

