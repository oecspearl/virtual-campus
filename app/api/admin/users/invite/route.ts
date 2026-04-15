import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';
import { notifyStudentWelcome } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    // Check if user has admin privileges
    if (!hasRole(userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    const body = await request.json();
    const { email, name, role = 'student', sendInvite = true } = body;

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user already exists in this tenant
    const { data: existingUser } = await tq
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists in this tenant" }, { status: 400 });
    }

    // Check if user exists in another tenant — if so, just add tenant membership
    const { data: globalUser } = await tq.raw
      .from('users')
      .select('id, name, email, role')
      .eq('email', email)
      .maybeSingle();

    if (globalUser) {
      // User exists globally — add them to this tenant via membership
      const { data: existingMembership } = await tq.raw
        .from('tenant_memberships')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', globalUser.id)
        .maybeSingle();

      if (existingMembership) {
        return NextResponse.json({ error: "User is already a member of this tenant" }, { status: 409 });
      }

      await tq.raw
        .from('tenant_memberships')
        .insert({
          tenant_id: tenantId,
          user_id: globalUser.id,
          role: role || 'student',
          is_primary: false,
        });

      return NextResponse.json({
        message: "Existing user added to tenant",
        user: globalUser,
        cross_tenant: true,
      });
    }

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

    const tempPassword = generateTempPassword();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await tq.raw.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email so user can log in immediately
      user_metadata: {
        full_name: name,
        role: role
      }
    });

    if (authError) {
      console.error('Auth error creating user:', authError);
      console.error('Password length:', tempPassword.length);
      console.error('Password contains uppercase:', /[A-Z]/.test(tempPassword));
      console.error('Password contains lowercase:', /[a-z]/.test(tempPassword));
      console.error('Password contains number:', /[0-9]/.test(tempPassword));
      return NextResponse.json({ 
        error: authError.message || 'Failed to create user account',
        details: authError.message
      }, { status: 500 });
    }

    // Verify the user was created and can authenticate
    console.log('User created successfully:', {
      userId: authData.user.id,
      email: authData.user.email,
      emailConfirmed: authData.user.email_confirmed_at ? true : false
    });

    // Create user in our database
    const { data: userRecord, error: userError } = await tq
      .from('users')
      .insert([{
        id: authData.user.id,
        email: email,
        name: name,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (userError) {
      console.error('Database error:', userError);
      // Roll back auth user
      await tq.raw.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Create user profile
    await tq
      .from('user_profiles')
      .insert([{
        user_id: authData.user.id,
        bio: '',
        avatar: null,
        learning_preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    // Create tenant membership
    await tq.raw
      .from('tenant_memberships')
      .insert({
        tenant_id: tenantId,
        user_id: authData.user.id,
        role: role || 'student',
        is_primary: true,
      });

    // Send welcome email if requested
    if (sendInvite && userRecord) {
      try {
        // Send custom welcome email with login credentials
        if (role === 'student') {
          const emailResult = await notifyStudentWelcome(authData.user.id, {
            temporaryPassword: tempPassword,
          });
          
          if (emailResult.success) {
            console.log('Welcome email sent successfully to:', email);
          } else {
            console.error('Failed to send welcome email:', emailResult.error);
            // Don't fail the request if email fails
          }
        } else {
          // For non-students, you might want to create a different welcome email template
          // For now, we'll still send the student welcome email
          const emailResult = await notifyStudentWelcome(authData.user.id, {
            temporaryPassword: tempPassword,
          });
          
          if (emailResult.success) {
            console.log('Welcome email sent successfully to:', email);
          } else {
            console.error('Failed to send welcome email:', emailResult.error);
          }
        }
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ 
      message: "User created successfully",
      user: userRecord,
      tempPassword: tempPassword, // Include in response for admin to share with user
      emailSent: sendInvite && userRecord ? true : false,
      note: sendInvite ? "Welcome email has been sent to the user" : "User created but email not sent"
    });

  } catch (error) {
    console.error('Admin invite user API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}



