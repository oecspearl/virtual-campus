import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, authorizeUser, createAuthResponse, checkRateLimitWithMeta, getRateLimitHeaders } from "@/lib/api-auth";
import { addSecurityHeaders, sanitizeInput, createSecureResponse } from "@/lib/security";
import { isValidHttpUrl } from "@/lib/validations";
import { createLogger } from "@/lib/logger";

interface UserProfileDoc {
  email: string;
  name: string;
  role: string;
  created_at?: unknown;
  updated_at?: unknown;
}

export async function GET(request: Request) {
  const log = createLogger('api/auth/profile', request as any);
  try {
    // Rate limiting (more lenient for auth profile)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rl = await checkRateLimitWithMeta(`profile-get-${clientIP}`, 200, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: getRateLimitHeaders(rl)
        }
      );
    }

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      log.warn('Authentication failed', { reason: authResult.error });
      return NextResponse.json(
        { error: `Authentication failed: ${authResult.error}` },
        { status: authResult.status || 401 }
      );
    }

    const { user, userProfile } = authResult;

    // Fetch user_profiles separately using service role to bypass RLS
    const serviceSupabase = createServiceSupabaseClient();
    let { data: profileData, error: profileError } = await serviceSupabase
      .from("user_profiles")
      .select("bio, avatar, learning_preferences")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      log.error('user_profiles fetch failed', { userId: user.id }, profileError);
      // Continue even if user_profiles fetch fails
    }

    // If no user_profiles record exists, create one
    if (!profileData && !profileError) {
      const defaultProfile = {
        user_id: user.id,
        tenant_id: userProfile.tenant_id || '00000000-0000-0000-0000-000000000001',
        bio: "",
        avatar: "",
        learning_preferences: {},
        updated_at: new Date().toISOString(),
      };

      const { data: createdProfile, error: createProfileError } = await serviceSupabase
        .from("user_profiles")
        .insert([defaultProfile])
        .select("bio, avatar, learning_preferences")
        .single();

      if (createProfileError) {
        log.error('user_profiles create failed', { userId: user.id }, createProfileError);
      } else {
        profileData = createdProfile;
      }
    }

    // Merge user and user_profiles data
    const mergedProfile = {
      ...userProfile,
      bio: profileData?.bio || "",
      avatar: profileData?.avatar || "",
      learning_preferences: profileData?.learning_preferences || {}
    };

    return createSecureResponse(mergedProfile);
  } catch (error) {
    log.error('GET handler crashed', {}, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const log = createLogger('api/auth/profile', request as any);
  try {
    // Rate limiting (stricter for updates)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rl = await checkRateLimitWithMeta(`profile-put-${clientIP}`, 10, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: getRateLimitHeaders(rl)
        }
      );
    }

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      log.warn('Authentication failed', { reason: authResult.error });
      return NextResponse.json(
        { error: `Authentication failed: ${authResult.error}` },
        { status: authResult.status || 401 }
      );
    }

    const { user, userProfile } = authResult;
    const supabase = await createServerSupabaseClient();

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      log.warn('Invalid JSON body', { error: String(parseError) });
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Extract and validate data
    const { bio, avatar, learning_preferences, ...userData } = body;
    
    // Sanitize user data to prevent role escalation
    const sanitizedUserData = {
      name: sanitizeInput(userData.name) || userProfile.name,
      email: userProfile.email, // Email cannot be changed
      role: userProfile.role,   // Role cannot be changed
      phone_number: userData.phone_number ? sanitizeInput(userData.phone_number) : null,
    };

    // Update users table (basic info only)
    const userPayload = {
      ...sanitizedUserData,
      id: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data: userResult, error: userError } = await supabase
      .from("users")
      .upsert(userPayload, { onConflict: "id" })
      .select("*")
      .single();

    if (userError) {
      log.error('users update failed', { userId: user.id }, userError);
      return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
    }

    // Validate and sanitize profile data
    const sanitizedBio = typeof bio === 'string' ? sanitizeInput(bio) : "";
    const sanitizedAvatar = typeof avatar === 'string' && isValidHttpUrl(avatar) ? sanitizeInput(avatar) : "";
    const sanitizedLearningPreferences = typeof learning_preferences === 'object' && learning_preferences !== null ? sanitizeInput(learning_preferences) : {};

    // Update user_profiles table
    const profilePayload = {
      user_id: user.id,
      tenant_id: userProfile.tenant_id || '00000000-0000-0000-0000-000000000001',
      bio: sanitizedBio,
      avatar: sanitizedAvatar,
      learning_preferences: sanitizedLearningPreferences,
      updated_at: new Date().toISOString(),
    };

    // Use service role client for user_profiles operations to bypass RLS
    const serviceSupabase = createServiceSupabaseClient();
    const { data: profileResult, error: profileError } = await serviceSupabase
      .from("user_profiles")
      .upsert(profilePayload, { onConflict: "user_id" })
      .select("*")
      .single();

    let finalProfileResult = profileResult;

    if (profileError) {
      log.warn('user_profiles upsert failed, retrying as insert', { userId: user.id, error: profileError.message });

      // If user_profiles update fails, try to create
      const { data: createData, error: createError } = await serviceSupabase
        .from("user_profiles")
        .insert(profilePayload)
        .select("*")
        .single();

      if (createError) {
        log.error('user_profiles insert fallback failed', { userId: user.id }, createError);
        // Return user data with empty profile fields if both fail
        return NextResponse.json({
          ...userResult,
          bio: bio || "",
          avatar: avatar || "",
          learning_preferences: learning_preferences || {}
        });
      } else {
        finalProfileResult = createData;
      }
    }

    // Return merged result
    const mergedResult = {
      ...userResult,
      bio: finalProfileResult?.bio || "",
      avatar: finalProfileResult?.avatar || "",
      learning_preferences: finalProfileResult?.learning_preferences || {}
    };

    return createSecureResponse(mergedResult);
  } catch (error) {
    log.error('PUT handler crashed', {}, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
