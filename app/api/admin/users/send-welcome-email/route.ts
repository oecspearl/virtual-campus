import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/database-helpers";
import { notifyStudentWelcome } from "@/lib/notifications";

/**
 * POST /api/admin/users/send-welcome-email
 * Send welcome email to an existing user
 * 
 * Body: { userId: string, temporaryPassword?: string }
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
    const { userId, temporaryPassword } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get user information
    const { data: user, error: userError } = await tq
      .from('users')
      .select('id, email, name, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If temporary password is provided, update the user's password
    let finalPassword = temporaryPassword;
    if (temporaryPassword) {
      // Validate password meets requirements
      if (temporaryPassword.length < 8) {
        return NextResponse.json({ 
          error: 'Password must be at least 8 characters long' 
        }, { status: 400 });
      }

      const { data: updatedUser, error: passwordError } = await tq.raw.auth.admin.updateUserById(
        userId,
        { 
          password: temporaryPassword,
          email_confirm: true // Ensure email is confirmed so user can log in
        }
      );

      if (passwordError) {
        console.error('Password update error:', passwordError);
        return NextResponse.json({ 
          error: `Failed to update password: ${passwordError.message}`,
          details: passwordError.message
        }, { status: 500 });
      }

      console.log('Password updated successfully for user:', {
        userId,
        email: user.email,
        emailConfirmed: updatedUser?.user?.email_confirmed_at ? true : false
      });
    } else {
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

      finalPassword = generateTempPassword();
      
      // Update user's password and ensure email is confirmed
      const { data: updatedUser, error: passwordError } = await tq.raw.auth.admin.updateUserById(
        userId,
        { 
          password: finalPassword,
          email_confirm: true // Ensure email is confirmed so user can log in
        }
      );

      if (passwordError) {
        console.error('Password update error:', passwordError);
        console.error('Password details:', {
          length: finalPassword.length,
          hasUppercase: /[A-Z]/.test(finalPassword),
          hasLowercase: /[a-z]/.test(finalPassword),
          hasNumber: /[0-9]/.test(finalPassword),
          hasSpecial: /[!@#$%^&*]/.test(finalPassword)
        });
        return NextResponse.json({ 
          error: `Failed to set password: ${passwordError.message}`,
          details: passwordError.message
        }, { status: 500 });
      }

      console.log('Password updated successfully for user:', {
        userId,
        email: user.email,
        emailConfirmed: updatedUser?.user?.email_confirmed_at ? true : false
      });
    }

    // Send welcome email
    try {
      const emailResult = await notifyStudentWelcome(userId, {
        temporaryPassword: finalPassword,
      });

      if (emailResult.success) {
        return NextResponse.json({
          success: true,
          message: "Welcome email sent successfully",
          email: user.email,
          temporaryPassword: finalPassword,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: emailResult.error || "Failed to send welcome email",
          email: user.email,
          temporaryPassword: finalPassword, // Still return password even if email fails
        }, { status: 500 });
      }
    } catch (emailError: any) {
      return NextResponse.json({
        success: false,
        error: emailError.message || "Failed to send welcome email",
        email: user.email,
        temporaryPassword: finalPassword, // Still return password even if email fails
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Send welcome email API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

