import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';
import { generateBadgeAssertion } from '@/lib/certificates/openbadges';
import { hasRole } from '@/lib/rbac';

/**
 * POST /api/badges/issue
 * Issue a badge to a user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and instructors can issue badges
    const isAdmin = hasRole(user.role, ['admin', 'super_admin', 'curriculum_designer']);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, badgeId, courseId, evidenceUrl } = body;

    if (!userId || !badgeId) {
      return NextResponse.json(
        { error: 'userId and badgeId are required' },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Check if badge exists
    const { data: badge, error: badgeError } = await serviceSupabase
      .from('badges')
      .select('*')
      .eq('id', badgeId)
      .single();

    if (badgeError || !badge) {
      return NextResponse.json(
        { error: 'Badge not found' },
        { status: 404 }
      );
    }

    // Check if user already has this badge for this course
    const existingBadgeFilter: any = {
      user_id: userId,
      badge_id: badgeId
    };
    if (courseId) {
      existingBadgeFilter.course_id = courseId;
    }

    const { data: existingBadge } = await serviceSupabase
      .from('user_badges')
      .select('id')
      .match(existingBadgeFilter)
      .single();

    if (existingBadge) {
      return NextResponse.json({
        message: 'Badge already issued',
        badge: existingBadge,
        alreadyExists: true
      });
    }

    // Generate OpenBadges assertion
    const assertion = await generateBadgeAssertion(userId, badgeId, courseId || null, evidenceUrl);
    
    // Create verification URL
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/badges/verify/${badgeId}?user=${userId}`;

    // Create user badge record
    const { data: userBadge, error: badgeIssueError } = await serviceSupabase
      .from('user_badges')
      .insert([{
        user_id: userId,
        badge_id: badgeId,
        course_id: courseId || null,
        evidence_url: evidenceUrl || null,
        badge_assertion: assertion,
        verification_url: verificationUrl,
        issued_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (badgeIssueError) {
      console.error('Error issuing badge:', badgeIssueError);
      return NextResponse.json(
        { error: 'Failed to issue badge' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Badge issued successfully',
      badge: userBadge
    });

  } catch (error: any) {
    console.error('Badge issuance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to issue badge' },
      { status: 500 }
    );
  }
}

