import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;

    if (!hasRole(userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { fileName } = await request.json();
    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `temp-imports/${timestamp}-${safeFileName}`;

    const serviceSupabase = createServiceSupabaseClient();

    const { data, error } = await serviceSupabase.storage
      .from('course-materials')
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error('[Upload URL] Failed to create signed upload URL:', error);
      return NextResponse.json({
        error: "Failed to create upload URL",
        details: error?.message
      }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      storagePath
    });
  } catch (error: any) {
    console.error('[Upload URL] Error:', error);
    return NextResponse.json({
      error: "Failed to generate upload URL",
      details: error.message
    }, { status: 500 });
  }
}
