import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { sendBulkEmail, wrapEmailTemplate } from '@/lib/email-service';
import { authenticateUser, checkRateLimit } from '@/lib/api-auth';

/**
 * POST /api/admin/users/bulk-email
 * Send bulk email to selected users (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;

    // Rate limit: 3 bulk email sends per minute
    if (!checkRateLimit(`bulk-email:${user.id}`, 3, 60000)) {
      return NextResponse.json({ error: 'Too many bulk email requests. Please wait.' }, { status: 429 });
    }

    // Verify user is admin
    const { data: userData } = await tq
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, subject, message } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 });
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get user details for selected users
    const { data: users, error: usersError } = await tq
      .from('users')
      .select('id, name, email')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'No valid users found' }, { status: 400 });
    }

    // Convert plain text message to HTML (preserve line breaks)
    const htmlMessage = message
      .split('\n')
      .map((line: string) => `<p style="margin: 0 0 10px 0;">${line || '&nbsp;'}</p>`)
      .join('');

    const emailHtml = wrapEmailTemplate(`
      <div style="color: #333333; line-height: 1.6;">
        ${htmlMessage}
      </div>
    `, { title: subject });

    // Prepare recipients with personalization variables
    const recipients = users.map(u => ({
      email: u.email,
      variables: {
        name: u.name || 'User',
        email: u.email,
      },
    }));

    // Send bulk email
    const results = await sendBulkEmail(
      recipients,
      { subject, html: emailHtml },
      { tags: [{ name: 'category', value: 'admin-bulk-email' }] }
    );

    // Count successes and failures
    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const errors = results
      .filter(r => !r.success && r.error)
      .map(r => `${r.email}: ${r.error}`);

    // Log the bulk email action
    console.log(`Bulk email sent by admin ${user.id}: ${sent} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: users.length,
      errors: errors.slice(0, 10), // Limit errors returned
    });
  } catch (error) {
    console.error('Error in bulk-email POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
