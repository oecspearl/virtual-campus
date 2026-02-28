/**
 * OneRoster Enrollments Endpoint
 * GET /ims/oneroster/v1p1/enrollments
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

    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from('oneroster_enrollments')
      .select('*')
      .eq('status', 'active')
      .range(offset, offset + limit - 1);

    if (filter) {
      const match = filter.match(/(\w+)='([^']+)'/);
      if (match) {
        query = query.eq(match[1], match[2]);
      }
    }

    query = query.order('date_last_modified', { ascending: false });

    const { data: enrollments, error } = await query;

    if (error) {
      console.error('OneRoster enrollments query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch enrollments' },
        { status: 500 }
      );
    }

    const response = {
      enrollments: (enrollments || []).map(enrollment => ({
        sourcedId: enrollment.sourced_id,
        status: enrollment.status,
        dateLastModified: enrollment.date_last_modified,
        metadata: enrollment.metadata,
        user: {
          sourcedId: enrollment.user_sourced_id,
        },
        class: {
          sourcedId: enrollment.class_sourced_id,
        },
        role: {
          type: enrollment.role,
        },
        primary: enrollment.primary_flag,
        beginDate: enrollment.begin_date,
        endDate: enrollment.end_date,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('OneRoster enrollments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

