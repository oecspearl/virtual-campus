import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/database-helpers";
import { notifyStudentWelcome } from "@/lib/notifications";

/**
 * POST /api/admin/users/send-welcome-email-bulk
 * Send welcome emails to multiple users
 * 
 * Body: { userIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    // Check if user has admin privileges
    if (!hasRole(userProfile.role, ['admin', 'super_admin'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "User IDs array is required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Generate a temporary password that meets requirements
    const generateTempPassword = () => {
      const length = 12;
      const lowercase = "abcdefghijklmnopqrstuvwxyz";
      const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const numbers = "0123456789";
      const special = "!@#$%^&*";
      const allChars = lowercase + uppercase + numbers + special;
      
      // Ensure password meets requirements: at least one of each type
      let password = "";
      password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
      password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
      password += numbers.charAt(Math.floor(Math.random() * numbers.length));
      password += special.charAt(Math.floor(Math.random() * special.length));
      
      // Fill the rest randomly
      for (let i = password.length; i < length; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
      }
      
      // Shuffle the password to avoid predictable patterns
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };

    const results = [];

    // Process each user
    for (const userId of userIds) {
      try {
        // Get user information
        const { data: user, error: userError } = await tq
          .from('users')
          .select('id, email, name, role')
          .eq('id', userId)
          .single();

        if (userError || !user) {
          results.push({
            userId,
            success: false,
            error: 'User not found',
            email: null,
          });
          continue;
        }

        // Generate a temporary password
        const tempPassword = generateTempPassword();

        // Update user's password and ensure email is confirmed
        const { error: passwordError } = await tq.raw.auth.admin.updateUserById(
          userId,
          { 
            password: tempPassword,
            email_confirm: true // Ensure email is confirmed so user can log in
          }
        );

        if (passwordError) {
          results.push({
            userId,
            success: false,
            error: `Failed to set password: ${passwordError.message}`,
            email: user.email,
          });
          continue;
        }

        // Send welcome email
        const emailResult = await notifyStudentWelcome(userId, {
          temporaryPassword: tempPassword,
        });

        results.push({
          userId,
          success: emailResult.success,
          error: emailResult.error || null,
          email: user.email,
          name: user.name,
        });

      } catch (error: any) {
        results.push({
          userId,
          success: false,
          error: error.message || 'Failed to process user',
          email: null,
        });
      }
    }

    // Calculate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${userIds.length} user(s): ${successful} successful, ${failed} failed`,
      total: userIds.length,
      successful,
      failed,
      results,
    });

  } catch (error: any) {
    console.error('Bulk send welcome email API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

