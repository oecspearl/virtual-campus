import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse, checkRateLimitWithMeta, getRateLimitHeaders } from "@/lib/api-auth";
import { addSecurityHeaders, sanitizeInput, createSecureResponse } from "@/lib/security";
import { createLogger } from "@/lib/logger";

export async function POST(request: Request) {
  const log = createLogger('api/auth/change-password', request as any);
  try {
    // Rate limiting for password changes (stricter)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    // 5 attempts per 5 minutes
    const rl = await checkRateLimitWithMeta(`password-change-${clientIP}`, 5, 300000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many password change attempts. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rl)
        }
      );
    }

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const supabase = await createServerSupabaseClient();

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      log.error('Invalid JSON body', undefined, parseError);
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: "New password is required" }, { status: 400 });
    }

    if (!confirmPassword || typeof confirmPassword !== 'string') {
      return NextResponse.json({ error: "Password confirmation is required" }, { status: 400 });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 });
    }

    if (newPassword.length > 128) {
      return NextResponse.json({ error: "New password must be less than 128 characters" }, { status: 400 });
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New password and confirmation do not match" }, { status: 400 });
    }

    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "New password must be different from current password" }, { status: 400 });
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInError) {
      log.warn('Current password verification failed', { userId: user.id });
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Update password using Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      log.error('Password update failed', { userId: user.id }, updateError);
      return NextResponse.json({ error: "Failed to update password. Please try again." }, { status: 500 });
    }

    log.info('Password changed', { userId: user.id });

    return createSecureResponse({
      message: "Password updated successfully"
    });

  } catch (error) {
    log.error('POST handler crashed', undefined, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

