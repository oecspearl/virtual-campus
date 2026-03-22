import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

// GET - Fetch all unique tags across library resources
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('library_resources')
      .select('tags')
      .eq('is_active', true);

    if (error) throw error;

    // Flatten and deduplicate tags
    const tagSet = new Set<string>();
    if (data) {
      for (const row of data) {
        if (Array.isArray(row.tags)) {
          for (const tag of row.tags) {
            tagSet.add(tag);
          }
        }
      }
    }

    const tags = Array.from(tagSet).sort();

    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
