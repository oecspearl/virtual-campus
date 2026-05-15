import { NextRequest, NextResponse } from 'next/server';
import { verifyQStashRequest } from '@/lib/qstash';
import { createTenantQuery } from '@/lib/tenant-query';
import { notifyStudentWelcome } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * QStash worker that processes a single welcome email.
 *
 * Enqueued by /api/admin/users/send-welcome-email-bulk. Runs one user
 * per invocation so QStash can retry individual failures without
 * re-sending succeeded emails. Returns 4xx for permanent failures
 * (QStash won't retry) and 5xx for transient ones (QStash will retry).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Step 1: verify QStash signature
  try {
    await verifyQStashRequest(request.headers.get('upstash-signature'), rawBody);
  } catch (err: any) {
    console.error('[jobs/send-welcome-email] signature check failed:', err?.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Step 2: parse payload
  let payload: { userId?: string; tenantId?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, tenantId } = payload;
  if (!userId || !tenantId) {
    return NextResponse.json({ error: 'Missing userId or tenantId' }, { status: 400 });
  }

  try {
    const tq = createTenantQuery(tenantId);

    // Look up the user inside the tenant
    const { data: user, error: userError } = await tq
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      // Permanent failure — don't retry
      return NextResponse.json({ error: 'User not found in tenant' }, { status: 404 });
    }

    // Generate a strong temporary password
    const tempPassword = generateTempPassword();

    // Reset password + confirm email so the user can sign in
    const { error: passwordError } = await tq.raw.auth.admin.updateUserById(userId, {
      password: tempPassword,
      email_confirm: true,
    });
    if (passwordError) {
      // 5xx — transient. QStash will retry.
      console.error('[jobs/send-welcome-email] password update failed:', passwordError);
      return NextResponse.json({ error: passwordError.message }, { status: 500 });
    }

    const emailResult = await notifyStudentWelcome(userId, { temporaryPassword: tempPassword });
    if (!emailResult.success) {
      // Transient: retry
      return NextResponse.json({ error: emailResult.error || 'Email send failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId, email: user.email });
  } catch (err: any) {
    console.error('[jobs/send-welcome-email] crashed:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

function generateTempPassword(): string {
  const length = 12;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + special;
  let password = '';
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += special.charAt(Math.floor(Math.random() * special.length));
  for (let i = password.length; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
