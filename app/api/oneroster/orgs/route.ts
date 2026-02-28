/**
 * OneRoster Organizations Endpoint
 * GET /ims/oneroster/v1p1/orgs
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

    // Parse OAuth parameters (simplified - in production, parse properly)
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const filter = searchParams.get('filter');
    const sort = searchParams.get('sort');
    const orderBy = searchParams.get('orderBy');

    // Query organizations
    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from('oneroster_organizations')
      .select('*')
      .eq('status', 'active')
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (filter) {
      // Parse OneRoster filter syntax (e.g., "type='school'")
      const match = filter.match(/(\w+)='([^']+)'/);
      if (match) {
        query = query.eq(match[1], match[2]);
      }
    }

    // Apply sorting
    if (sort || orderBy) {
      const sortField = sort || orderBy || 'name';
      query = query.order(sortField, { ascending: true });
    } else {
      query = query.order('name', { ascending: true });
    }

    const { data: orgs, error } = await query;

    if (error) {
      console.error('OneRoster orgs query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    // Format OneRoster response
    const response = {
      orgs: (orgs || []).map(org => ({
        sourcedId: org.sourced_id,
        status: org.status,
        dateLastModified: org.date_last_modified,
        metadata: org.metadata,
        name: org.name,
        identifier: org.identifier,
        type: org.type,
        parent: org.parent_sourced_id ? {
          sourcedId: org.parent_sourced_id,
        } : null,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('OneRoster orgs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

