/**
 * LTI 1.3 OIDC Login Initiation
 * Handles OIDC login flow initiation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLTITool } from '@/lib/lti/core';
import { generateNonce } from '@/lib/lti/core';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const iss = searchParams.get('iss');
    const login_hint = searchParams.get('login_hint');
    const target_link_uri = searchParams.get('target_link_uri');
    const lti_message_hint = searchParams.get('lti_message_hint');
    const client_id = searchParams.get('client_id');

    if (!iss || !login_hint || !target_link_uri || !client_id) {
      return NextResponse.json(
        { error: 'Missing required OIDC parameters' },
        { status: 400 }
      );
    }

    // Get tool by client_id
    const tool = await getLTITool(client_id);
    if (!tool || (tool as any).status !== 'active') {
      return NextResponse.json(
        { error: 'LTI tool not found or inactive' },
        { status: 404 }
      );
    }

    // Generate state and nonce
    const state = generateNonce();
    const nonce = generateNonce();

    // Store state for validation
    const supabase = createServiceSupabaseClient();
    await supabase.from('lti_launches').insert({
      tool_id: tool.id,
      user_id: login_hint, // This will be updated after authentication
      nonce,
      state,
      launch_data: {
        iss,
        login_hint,
        target_link_uri,
        lti_message_hint,
      },
      expires_at: new Date(Date.now() + 600000).toISOString(), // 10 minutes
    });

    // Redirect to OIDC login URL with state and nonce
    const redirectUrl = new URL(tool.tool_oidc_login_url || tool.login_url);
    redirectUrl.searchParams.set('state', state);
    redirectUrl.searchParams.set('nonce', nonce);
    redirectUrl.searchParams.set('login_hint', login_hint);
    redirectUrl.searchParams.set('target_link_uri', target_link_uri);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OIDC login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OIDC login' },
      { status: 500 }
    );
  }
}

