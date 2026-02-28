import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/database-helpers";

// GET editor preference (public - all users can read)
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get editor setting (using service client so it bypasses RLS for public reads)
    const { data: setting, error } = await tq
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'editor_type')
      .maybeSingle();

    // Handle errors gracefully - table might not exist yet, or record might not exist
    if (error) {
      // PGRST116 is "not found" which is OK, 42P01 is "relation does not exist"
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('Editor setting not found, using default (proseforge)');
        return NextResponse.json({ editorType: 'proseforge' });
      }
      console.error('Error fetching editor setting:', error);
      return NextResponse.json({ editorType: 'proseforge' });
    }

    let editorType = setting?.setting_value || 'proseforge';

    // Migrate removed editors to proseforge
    if (editorType === 'learnboard' || editorType === 'ckeditor5' || editorType === 'quill') {
      editorType = 'proseforge';
    }

    return NextResponse.json({ editorType });

  } catch (error: any) {
    // Catch any unexpected errors (e.g., Supabase client not initialized)
    console.error('Error fetching editor preference:', error);
    // Always default to proseforge to ensure the app continues to work
    return NextResponse.json({
      editorType: 'proseforge',
      message: error?.message || 'Using default editor'
    }, { status: 200 }); // Return 200 with default value instead of 500
  }
}

// PUT/POST to update editor preference (admin only)
export async function PUT(request: NextRequest) {
  try {
    let { editorType } = await request.json();

    // Migrate removed editors to proseforge
    if (editorType === 'ckeditor5' || editorType === 'quill' || editorType === 'learnboard') {
      editorType = 'proseforge';
    }

    if (!editorType || !['tinymce', 'editorjs', 'lexical', 'slate', 'proseforge'].includes(editorType)) {
      return NextResponse.json(
        { error: "Invalid editor type. Must be 'tinymce', 'editorjs', 'lexical', 'slate', or 'proseforge'" },
        { status: 400 }
      );
    }

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

    // Check if table exists first
    const { error: checkError } = await tq
      .from('system_settings')
      .select('setting_key')
      .limit(1);

    if (checkError) {
      // Handle missing table error
      if (checkError.code === '42P01' || checkError.message?.includes('does not exist')) {
        console.error('system_settings table does not exist. Please run the database migration.');
        return NextResponse.json(
          { 
            error: "Database table not found. Please run the database migration (create-system-settings-schema.sql) first.",
            code: 'TABLE_NOT_FOUND',
            details: process.env.NODE_ENV === 'development' ? checkError.message : undefined
          },
          { status: 500 }
        );
      }
    }

    // Upsert editor setting
    const { data, error } = await tq
      .from('system_settings')
      .upsert({
        setting_key: 'editor_type',
        setting_value: editorType,
        description: 'Default text editor for the application. Options: tinymce, editorjs, lexical, slate, proseforge',
        updated_at: new Date().toISOString(),
        updated_by: userProfile.id,
      }, {
        onConflict: 'setting_key',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating editor setting:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // Provide specific error messages
      if (error.code === '42P01') {
        return NextResponse.json(
          { 
            error: "Database table not found. Please run the database migration (create-system-settings-schema.sql) first.",
            code: 'TABLE_NOT_FOUND'
          },
          { status: 500 }
        );
      } else if (error.code === '42501') {
        return NextResponse.json(
          { 
            error: "Permission denied. Please check RLS policies on system_settings table.",
            code: 'PERMISSION_DENIED'
          },
          { status: 403 }
        );
      } else if (error.code === '23503') {
        return NextResponse.json(
          { 
            error: "Invalid user reference. Please ensure the user exists.",
            code: 'FK_VIOLATION'
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: "Failed to update editor setting",
          code: error.code || 'UNKNOWN_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Editor preference updated successfully",
      editorType: data.setting_value,
    });

  } catch (error: any) {
    console.error('Error updating editor preference:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

// Support POST method as well
export async function POST(request: NextRequest) {
  return PUT(request);
}

