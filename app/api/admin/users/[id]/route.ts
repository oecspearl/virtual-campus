import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';
import { userUpdateSchema, validateBody } from "@/lib/validations";
import { deleteUserCascade } from "@/lib/delete-user-cascade";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get user data
    const { data: user, error: userError } = await tq
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user profile data
    const { data: profile, error: profileError } = await tq
      .from('user_profiles')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Don't fail, just return user without profile
    }

    // Combine user and profile data
    const userData = {
      ...user,
      profile: profile || {
        bio: '',
        avatar: null,
        learning_preferences: {}
      }
    };

    return NextResponse.json({ user: userData });

  } catch (error) {
    console.error('Admin user GET API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = validateBody(userUpdateSchema, body);
    if (!validation.success) return validation.response;

    const {
      name,
      email,
      role,
      gender,
      student_id,
      password,
      bio,
      avatar,
      learning_preferences,
      grade_level,
      subject_areas,
      learning_style,
      difficulty_preference,
      parent_email,
      school_id
    } = validation.data;

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

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Prepare user update data
    const userUpdateData: any = {
      name,
      email,
      role,
      updated_at: new Date().toISOString()
    };

    // Add gender if provided (convert empty string to null to satisfy CHECK constraint)
    if (gender !== undefined) {
      // Only set gender if it's a valid value, otherwise set to null
      const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
      userUpdateData.gender = gender && validGenders.includes(gender) ? gender : null;
    }

    // Add student_id if provided
    if (student_id !== undefined) {
      userUpdateData.student_id = student_id || null;
    }

    // Add school_id if provided (null to unassign, UUID to assign)
    if (school_id !== undefined) {
      userUpdateData.school_id = school_id || null;
    }

    // Update user in our database
    const { data: userRecord, error: userError } = await tq
      .from('users')
      .update(userUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (userError) {
      console.error('Database error:', userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Update user in Supabase Auth
    const authUpdateData: any = {
      email,
      user_metadata: {
        full_name: name
      }
    };

    // Add password if provided
    if (password && password.trim() !== '') {
      authUpdateData.password = password;
    }

    const { error: authError } = await tq.raw.auth.admin.updateUserById(id, authUpdateData);

    if (authError) {
      console.error('Auth update error:', authError);
      // Don't fail the request, just log the error
    }

    // Update or create user profile
    const profileUpdateData: any = {
      updated_at: new Date().toISOString()
    };

    if (bio !== undefined) profileUpdateData.bio = bio;
    if (avatar !== undefined) profileUpdateData.avatar = avatar;
    if (learning_preferences !== undefined) profileUpdateData.learning_preferences = learning_preferences;

    // Handle learning preferences from individual fields
    if (grade_level || subject_areas || learning_style || difficulty_preference) {
      const currentPreferences = learning_preferences || {};
      const newPreferences = { ...currentPreferences };
      
      if (grade_level) newPreferences.grade_level = grade_level;
      if (subject_areas) newPreferences.subject_interests = subject_areas;
      if (learning_style) newPreferences.learning_style = learning_style;
      if (difficulty_preference) newPreferences.difficulty_preference = difficulty_preference;
      
      profileUpdateData.learning_preferences = newPreferences;
    }

    // Check if profile exists
    const { data: existingProfile } = await tq
      .from('user_profiles')
      .select('id')
      .eq('user_id', id)
      .maybeSingle();

    if (existingProfile) {
      // Update existing profile
      const { error: profileError } = await tq
        .from('user_profiles')
        .update(profileUpdateData)
        .eq('user_id', id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Don't fail the request, just log the error
      }
    } else {
      // Create new profile
      const { error: profileError } = await tq
        .from('user_profiles')
        .insert([{
          user_id: id,
          ...profileUpdateData,
          created_at: new Date().toISOString()
        }]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the request, just log the error
      }
    }

    // Update enrollments with denormalized data if any profile fields changed
    if (bio !== undefined || avatar !== undefined || learning_preferences !== undefined || 
        grade_level || subject_areas || learning_style || difficulty_preference) {
      
      const enrollmentUpdateData: any = {
        updated_at: new Date().toISOString()
      };

      if (bio !== undefined) enrollmentUpdateData.student_bio = bio;
      if (avatar !== undefined) enrollmentUpdateData.student_avatar = avatar;
      if (learning_preferences !== undefined) enrollmentUpdateData.learning_preferences = learning_preferences;

      // Update enrollments with new denormalized data
      await tq
        .from('enrollments')
        .update(enrollmentUpdateData)
        .eq('student_id', id);
    }

    return NextResponse.json({ 
      message: "User updated successfully", 
      user: userRecord 
    });

  } catch (error) {
    console.error('Admin user PUT API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Delete user and all dependent records
    const result = await deleteUserCascade(tq, id);

    if (!result.success) {
      console.error('Delete error:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      message: "User deleted successfully"
    });

  } catch (error) {
    console.error('Admin user DELETE API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
