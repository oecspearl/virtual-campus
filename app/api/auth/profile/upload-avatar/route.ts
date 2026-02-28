import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

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

    // Upload file to Supabase Storage
    // Use course-materials bucket with profile-pictures folder, or create dedicated bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-materials')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: "File upload failed", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('course-materials')
      .getPublicUrl(fileName);

    if (!urlData || !urlData.publicUrl) {
      console.error("Failed to get public URL for uploaded file");
      // Try to clean up uploaded file
      await supabase.storage.from('course-materials').remove([fileName]);
      return NextResponse.json(
        { error: "Failed to generate file URL" },
        { status: 500 }
      );
    }

    // Update user_profiles with new avatar URL
    // Use service client to bypass RLS (should work if service role key is set)
    // If service client fails, the RLS policies should allow the user to update their own profile
    let profileResult;
    let profileError;
    
    // First, try with service client (bypasses RLS completely)
    const serviceSupabase = createServiceSupabaseClient();
    const serviceResult = await serviceSupabase
      .from("user_profiles")
      .upsert({
        user_id: user.id,
        avatar: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("avatar")
      .single();
    
    profileResult = serviceResult.data;
    profileError = serviceResult.error;
    
    // If service client failed (likely RLS issue), try with regular client
    // This will work if RLS policies are properly configured
    if (profileError && profileError.message?.includes('row-level security')) {
      console.log("Service client failed with RLS error, trying regular client with RLS policies...");
      const regularResult = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          avatar: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select("avatar")
        .single();
      
      profileResult = regularResult.data;
      profileError = regularResult.error;
    }

    if (profileError) {
      console.error("Profile update error:", profileError);
      console.error("Error code:", profileError.code);
      console.error("Error message:", profileError.message);
      console.error("Error hint:", profileError.hint);
      console.error("Error details:", JSON.stringify(profileError, null, 2));
      
      // Try to clean up uploaded file
      try {
        await supabase.storage.from('course-materials').remove([fileName]);
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
          error: errorMessage,
          details: profileError.message || profileError.hint || "Unknown error",
          code: profileError.code
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
        error: "Internal server error",
        details: error?.message || "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
