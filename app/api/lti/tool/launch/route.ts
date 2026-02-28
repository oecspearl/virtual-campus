/**
 * LTI Tool Launch Endpoint
 * Receives launches from external platforms (Canvas, Blackboard, Moodle, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import {
  getExternalPlatform,
  validateExternalPlatformJWT,
  findOrCreateUserFromLTI,
  generateSessionToken,
} from '@/lib/lti/tool-consumer';
import { LTIJWTClaims } from '@/lib/lti/core';

export async function POST(request: NextRequest) {
  try {
    // Parse form data (LTI launches come as application/x-www-form-urlencoded)
    const formData = await request.formData();
    const idToken = formData.get('id_token') as string;
    const state = formData.get('state') as string | null;

    if (!idToken) {
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>LTI Launch Error</title></head><body><h1>Error</h1><p>Missing id_token parameter</p></body></html>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Decode JWT to get issuer (without verification first)
    let decoded: any;
    try {
      decoded = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString());
    } catch (error) {
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>LTI Launch Error</title></head><body><h1>Error</h1><p>Invalid JWT format</p></body></html>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    const issuer = decoded.iss;
    if (!issuer) {
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>LTI Launch Error</title></head><body><h1>Error</h1><p>Missing issuer in JWT</p></body></html>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Get platform configuration
    const platform = await getExternalPlatform(issuer);
    if (!platform) {
      console.error(`[LTI Tool Launch] Platform not found for issuer: ${issuer}`);
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>LTI Launch Error</title></head><body><h1>Error</h1><p>Platform not registered. Please contact your administrator.</p></body></html>',
        {
          status: 403,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Validate JWT
    let claims: LTIJWTClaims;
    try {
      claims = await validateExternalPlatformJWT(idToken, platform);
    } catch (error) {
      console.error('[LTI Tool Launch] JWT validation failed:', error);
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>LTI Launch Error</title></head><body><h1>Error</h1><p>Invalid or expired launch token. Please try again.</p></body></html>',
        {
          status: 401,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Extract LTI claims
    const ltiRoles = claims['https://purl.imsglobal.org/spec/lti/claim/roles'] || [];
    const contextId = claims['https://purl.imsglobal.org/spec/lti/claim/context']?.id;
    const contextTitle = claims['https://purl.imsglobal.org/spec/lti/claim/context']?.title;
    const resourceLink = claims['https://purl.imsglobal.org/spec/lti/claim/resource_link'];
    const launchPresentation = claims['https://purl.imsglobal.org/spec/lti/claim/launch_presentation'];
    const returnUrl = launchPresentation?.return_url;

    // Find or create user
    let userId: string | null;
    try {
      userId = await findOrCreateUserFromLTI(claims, platform);
    } catch (error) {
      console.error('[LTI Tool Launch] User provisioning failed:', error);
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>LTI Launch Error</title></head><body><h1>Error</h1><p>Failed to authenticate user. Please contact your administrator.</p></body></html>',
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    if (!userId) {
      return new NextResponse(
        '<!DOCTYPE html><html><head><title>LTI Launch Error</title></head><body><h1>Error</h1><p>User not found and auto-provisioning is disabled. Please contact your administrator.</p></body></html>',
        {
          status: 403,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Generate session token
    const sessionToken = generateSessionToken();

    // Store launch record
    const supabase = createServiceSupabaseClient();
    const { error: launchError } = await supabase
      .from('lti_tool_launches')
      .insert({
        platform_id: platform.id,
        user_id: userId,
        lti_user_id: claims.sub,
        email: claims.email || null,
        name: claims.name || null,
        roles: ltiRoles,
        context_id: contextId || null,
        context_title: contextTitle || null,
        resource_link_id: resourceLink?.id || null,
        resource_link_title: resourceLink?.title || null,
        message_type: claims['https://purl.imsglobal.org/spec/lti/claim/message_type'] || 'LtiResourceLinkRequest',
        version: claims['https://purl.imsglobal.org/spec/lti/claim/version'] || '1.3.0',
        nonce: claims.nonce || sessionToken,
        launch_presentation_return_url: returnUrl || null,
        custom_parameters: claims['https://purl.imsglobal.org/spec/lti/claim/custom'] || {},
        launch_data: claims,
        session_token: sessionToken,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        redirect_url: null, // Will be set based on context
      });

    if (launchError) {
      console.error('[LTI Tool Launch] Error storing launch:', launchError);
    }

    // Create Supabase session for the user
    // We'll use a special endpoint to exchange the session token for a real session
    const redirectUrl = new URL('/api/lti/tool/session', request.url);
    redirectUrl.searchParams.set('token', sessionToken);
    if (contextId) {
      redirectUrl.searchParams.set('context_id', contextId);
    }
    if (returnUrl) {
      redirectUrl.searchParams.set('return_url', returnUrl);
    }

    // Redirect to session creation endpoint
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[LTI Tool Launch] Unexpected error:', error);
    return new NextResponse(
      '<!DOCTYPE html><html><head><title>LTI Launch Error</title></head><body><h1>Error</h1><p>An unexpected error occurred. Please try again or contact support.</p></body></html>',
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}



