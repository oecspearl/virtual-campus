import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// Maximum file size for profile pictures (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

export async function POST(request: Request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const serviceSupabase = createServiceSupabaseClient();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    // Generate unique filename with user ID prefix for organization
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `profile-pictures/${user.id}/${timestamp}-${randomString}.${fileExtension}`;

    // Upload file to Supabase Storage using service client (bypasses RLS)
    const { data: uploadData, error: uploadError } = await serviceSupabase.storage
      .from('course-materials')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: "File upload failed" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = serviceSupabase.storage
      .from('course-materials')
      .getPublicUrl(fileName);

    if (!urlData || !urlData.publicUrl) {
      console.error("Failed to get public URL for uploaded file");
      // Try to clean up uploaded file
      await serviceSupabase.storage.from('course-materials').remove([fileName]);
      return NextResponse.json(
        { error: "Failed to generate file URL" },
        { status: 500 }
      );
    }

    // Update user_profiles with new avatar URL
    const tenantId = user.tenant_id || '00000000-0000-0000-0000-000000000001';
    const serviceResult = await serviceSupabase
      .from("user_profiles")
      .upsert({
        user_id: user.id,
        tenant_id: tenantId,
        avatar: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("avatar")
      .single();

    const profileResult = serviceResult.data;
    const profileError = serviceResult.error;

    if (profileError) {
      console.error("Profile update error:", profileError);
      console.error("Error code:", profileError.code);
      console.error("Error message:", profileError.message);
      console.error("Error hint:", profileError.hint);
      console.error("Error details:", JSON.stringify(profileError, null, 2));
      
      // Try to clean up uploaded file
      try {
        await serviceSupabase.storage.from('course-materials').remove([fileName]);
      } catch (cleanupError) {
        console.error("Failed to cleanup uploaded file:", cleanupError);
      }
      
      // Provide helpful error message
      let errorMessage = "Failed to update profile with new avatar";
      if (profileError.message?.includes('row-level security')) {
        errorMessage += ". Please ensure RLS policies are configured. Run the SQL file: database/fix-user-profiles-rls-policies.sql";
      }
      
      return NextResponse.json(
        {
          error: errorMessage
        },
        { status: 500 }
      );
    }

    // Optionally: Delete old avatar if it exists and is in our storage
    // (This would require checking if the old avatar URL is from our storage)

    return NextResponse.json({
      success: true,
      avatar: urlData.publicUrl,
      message: "Profile picture uploaded successfully"
    });

  } catch (error: any) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      {
        error: "Internal server error"
      },
      { status: 500 }
    );
  }
}
