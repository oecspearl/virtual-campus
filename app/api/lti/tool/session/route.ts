/**
 * LTI Tool Session Creation
 * Creates a Supabase session from LTI launch token and redirects to course
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionToken = searchParams.get('token');
    const contextId = searchParams.get('context_id');
    const returnUrl = searchParams.get('return_url');

    if (!sessionToken) {
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>Session Error</title></head><body><h1>Error</h1><p>Missing session token</p></body></html>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Get launch record
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: launch, error: launchError } = await tq.from('lti_tool_launches')
      .select('user_id, context_id, context_title, resource_link_id, launch_presentation_return_url')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (launchError || !launch || !launch.user_id) {
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>Session Error</title></head><body><h1>Error</h1><p>Invalid or expired session token</p></body></html>',
        {
          status: 401,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Get user email for session creation
    const { data: user } = await tq
      .from('users')
      .select('email')
      .eq('id', launch.user_id)
      .single();

    if (!user || !user.email) {
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>Session Error</title></head><body><h1>Error</h1><p>User not found</p></body></html>',
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Create a magic link session for the user
    // Note: In production, you might want to use a more secure method
    // For now, we'll redirect to a special auth endpoint that creates the session
    const authUrl = new URL('/api/lti/tool/auth', request.url);
    authUrl.searchParams.set('user_id', launch.user_id);
    authUrl.searchParams.set('token', sessionToken);
    if (contextId || launch.context_id) {
      authUrl.searchParams.set('context_id', contextId || launch.context_id || '');
    }
    if (returnUrl || launch.launch_presentation_return_url) {
      authUrl.searchParams.set('return_url', returnUrl || launch.launch_presentation_return_url || '');
    }

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[LTI Tool Session] Error:', error);
    return new NextResponse(
      '<!DOCTYPE html><html><head><title>Session Error</title></head><body><h1>Error</h1><p>Failed to create session</p></body></html>',
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}



