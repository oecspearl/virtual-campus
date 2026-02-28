import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/resources - Get all resources with filtering
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get("resource_type");
    const subjectArea = searchParams.get("subject_area");
    const gradeLevel = searchParams.get("grade_level");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sort_by") || "created_at";
    const sortOrder = searchParams.get("sort_order") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("lecturer_resources")
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(id, name, email)
      `)
      .eq("is_approved", true)
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }

    if (subjectArea) {
      query = query.eq("subject_area", subjectArea);
    }

    if (gradeLevel) {
      query = query.eq("grade_level", gradeLevel);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: resources, error } = await query;

    if (error) {
      console.error("Error fetching resources:", error);
      return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("lecturer_resources")
      .select("*", { count: "exact", head: true })
      .eq("is_approved", true);

    if (resourceType) countQuery = countQuery.eq("resource_type", resourceType);
    if (subjectArea) countQuery = countQuery.eq("subject_area", subjectArea);
    if (gradeLevel) countQuery = countQuery.eq("grade_level", gradeLevel);
    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      resources: resources || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });
  } catch (error) {
    console.error("Resources API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/lecturers/resources - Upload a new resource
export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const resourceType = formData.get("resource_type") as string;
    const subjectArea = formData.get("subject_area") as string | null;
    const gradeLevel = formData.get("grade_level") as string | null;
    const tags = formData.get("tags") as string | null;
    const licenseType = formData.get("license_type") as string || "oecs-internal";

    if (!file || !title || !resourceType) {
      return NextResponse.json({ 
        error: "File, title, and resource_type are required" 
      }, { status: 400 });
    }

    // File size limit (100MB for resources)
    const maxBytes = 100 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 100MB." 
      }, { status: 413 });
    }

    const supabase = await createServerSupabaseClient();

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `lecturer-resources/${timestamp}-${randomString}.${fileExtension}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-materials')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ 
        error: "File upload failed",
        details: uploadError.message 
      }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('course-materials')
      .getPublicUrl(fileName);

    // Parse tags
    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

    // Store resource metadata
    const { data: resource, error: dbError } = await supabase
      .from("lecturer_resources")
      .insert([{
        title: title.trim(),
        description: description?.trim() || null,
        resource_type: resourceType,
        subject_area: subjectArea || null,
        grade_level: gradeLevel || null,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
        license_type: licenseType,
        tags: tagsArray.length > 0 ? tagsArray : null,
      }])
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(id, name, email)
      `)
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('course-materials').remove([fileName]);
      return NextResponse.json({ error: "Failed to save resource metadata" }, { status: 500 });
    }

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    console.error("Create resource API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

