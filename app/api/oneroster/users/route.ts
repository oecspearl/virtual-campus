/**
 * OneRoster Users Endpoint
 * GET /ims/oneroster/v1p1/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOAuth1Signature } from '@/lib/oneroster/auth';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Verify OAuth 1.0 authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('OAuth ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const oauthParams: any = {};
    authHeader.substring(6).split(',').forEach(param => {
      const [key, value] = param.trim().split('=');
      oauthParams[key] = value?.replace(/^"|"$/g, '');
    });

    const authResult = await verifyOAuth1Signature(
      'GET',
      request.url,
      oauthParams as any
    );

    if (!authResult) {
      return NextResponse.json(
        { error: 'Invalid OAuth signature' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const filter = searchParams.get('filter');
    const role = searchParams.get('role');

    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from('oneroster_users')
      .select('*')
      .eq('status', 'active')
      .range(offset, offset + limit - 1);

    if (role) {
      query = query.eq('role', role);
    }

    if (filter) {
      const match = filter.match(/(\w+)='([^']+)'/);
      if (match) {
        query = query.eq(match[1], match[2]);
      }
    }

    query = query.order('family_name', { ascending: true });

    const { data: users, error } = await query;

    if (error) {
      console.error('OneRoster users query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    const response = {
      users: (users || []).map(user => ({
        sourcedId: user.sourced_id,
        status: user.status,
        dateLastModified: user.date_last_modified,
        metadata: user.metadata,
        username: user.username,
        userIds: user.user_ids || [],
        givenName: user.given_name,
        familyName: user.family_name,
        middleName: user.middle_name,
        identifier: user.identifier,
        email: user.email,
        sms: user.sms,
        phone: user.phone,
        agents: user.agents || [],
        orgs: (user.org_sourced_ids || []).map((orgId: string) => ({
          sourcedId: orgId,
        })),
        role: {
          type: user.role,
        },
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('OneRoster users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

