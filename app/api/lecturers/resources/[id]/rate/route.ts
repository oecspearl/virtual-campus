import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// POST /api/lecturers/resources/[id]/rate - Rate a resource
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const body = await request.json();
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if resource exists
    const { data: resource } = await supabase
      .from("lecturer_resources")
      .select("id")
      .eq("id", resourceId)
      .single();

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Check if user already rated this resource
    const { data: existingRating } = await supabase
      .from("lecturer_resource_ratings")
      .select("id")
      .eq("resource_id", resourceId)
      .eq("user_id", user.id)
      .single();

    let ratingData;
    if (existingRating) {
      // Update existing rating
      const { data, error } = await supabase
        .from("lecturer_resource_ratings")
        .update({
          rating,
          comment: comment || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingRating.id)
        .select(`
          *,
          user:users!user_id(id, name, email)
        `)
        .single();

      if (error) {
        console.error("Error updating rating:", error);
        return NextResponse.json({ error: "Failed to update rating" }, { status: 500 });
      }

      ratingData = data;
    } else {
      // Create new rating
      const { data, error } = await supabase
        .from("lecturer_resource_ratings")
        .insert([{
          resource_id: resourceId,
          user_id: user.id,
          rating,
          comment: comment || null
        }])
        .select(`
          *,
          user:users!user_id(id, name, email)
        `)
        .single();

      if (error) {
        console.error("Error creating rating:", error);
        return NextResponse.json({ error: "Failed to create rating" }, { status: 500 });
      }

      ratingData = data;
    }

    // Get updated resource with new average rating
    const { data: updatedResource } = await supabase
      .from("lecturer_resources")
      .select("average_rating, rating_count")
      .eq("id", resourceId)
      .single();

    return NextResponse.json({
      rating: ratingData,
      resource_stats: updatedResource
    });
  } catch (error) {
    console.error("Rate resource API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lecturers/resources/[id]/rate - Remove rating
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("lecturer_resource_ratings")
      .delete()
      .eq("resource_id", resourceId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting rating:", error);
      return NextResponse.json({ error: "Failed to delete rating" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete rating API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

