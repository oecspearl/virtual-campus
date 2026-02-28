import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { verifyBadgeAssertion } from '@/lib/certificates/openbadges';

/**
 * GET /api/badges/verify/[badgeId]
 * Verify a badge assertion (OpenBadges compliant)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ badgeId: string }> }
) {
  try {
    const { badgeId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('user');
    const assertionId = url.searchParams.get('assertion');

    if (!userId && !assertionId) {
      return NextResponse.json(
        { error: 'User ID or assertion ID required' },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceSupabaseClient();

    if (assertionId) {
      // Verify using assertion ID
      const verification = await verifyBadgeAssertion(assertionId);
      return NextResponse.json(verification);
    }

    // Verify using user ID and badge ID
    const { data: userBadge, error } = await serviceSupabase
      .from('user_badges')
      .select('*, badge:badges(*), user:users!user_badges_user_id_fkey(name, email)')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single();

    if (error || !userBadge) {
      return NextResponse.json({
        valid: false,
        error: 'Badge not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      assertion: userBadge.badge_assertion,
      badge: {
        name: (userBadge.badge as any)?.name,
        description: (userBadge.badge as any)?.description,
        image: (userBadge.badge as any)?.image_url
      },
      recipient: {
        name: (userBadge.user as any)?.name,
        email: (userBadge.user as any)?.email
      },
      issuedAt: userBadge.issued_at
    });

  } catch (error: any) {
    console.error('Badge verification error:', error);
    return NextResponse.json(
      { valid: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}

