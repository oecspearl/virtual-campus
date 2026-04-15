import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { generateBadgeAssertion } from '@/lib/certificates/openbadges';

/**
 * POST /api/badges/issue
 * Issue a badge to a user
 */
export const POST = withTenantAuth(async ({ user, tq, request }) => {
  const body = await request.json();
  const { userId, badgeId, courseId, evidenceUrl } = body;

  if (!userId || !badgeId) {
    return NextResponse.json(
      { error: 'userId and badgeId are required' },
      { status: 400 }
    );
  }

  // Check if badge exists
  const { data: badge, error: badgeError } = await tq
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
  let existingQuery = tq
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_id', badgeId);

  if (courseId) {
    existingQuery = existingQuery.eq('course_id', courseId);
  }

  const { data: existingBadge } = await existingQuery.single();

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
  const { data: userBadge, error: badgeIssueError } = await tq
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
}, { requiredRoles: ['admin', 'super_admin', 'curriculum_designer'] as const });
