import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// POST /api/lecturers/forums/votes - Vote on a post or reply
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

    const body = await request.json();
    const { post_id, reply_id, vote_type } = body;

    if (!vote_type || !['up', 'down'].includes(vote_type)) {
      return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
    }

    if (!post_id && !reply_id) {
      return NextResponse.json({ error: "Either post_id or reply_id is required" }, { status: 400 });
    }

    if (post_id && reply_id) {
      return NextResponse.json({ error: "Cannot vote on both post and reply" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user already voted
    let existingVoteQuery = supabase
      .from("lecturer_forum_votes")
      .select("*")
      .eq("user_id", user.id);

    if (post_id) {
      existingVoteQuery = existingVoteQuery.eq("post_id", post_id).is("reply_id", null);
    } else {
      existingVoteQuery = existingVoteQuery.eq("reply_id", reply_id).is("post_id", null);
    }

    const { data: existingVote } = await existingVoteQuery.single();

    if (existingVote) {
      // If same vote type, remove vote (toggle off)
      if (existingVote.vote_type === vote_type) {
        const { error: deleteError } = await supabase
          .from("lecturer_forum_votes")
          .delete()
          .eq("id", existingVote.id);

        if (deleteError) {
          console.error("Error removing vote:", deleteError);
          return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 });
        }

        return NextResponse.json({ vote: null, action: "removed" });
      } else {
        // Update vote type
        const { data: updatedVote, error: updateError } = await supabase
          .from("lecturer_forum_votes")
          .update({ vote_type })
          .eq("id", existingVote.id)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating vote:", updateError);
          return NextResponse.json({ error: "Failed to update vote" }, { status: 500 });
        }

        return NextResponse.json({ vote: updatedVote, action: "updated" });
      }
    } else {
      // Create new vote
      const voteData: any = {
        user_id: user.id,
        vote_type
      };

      if (post_id) {
        voteData.post_id = post_id;
      } else {
        voteData.reply_id = reply_id;
      }

      const { data: newVote, error: insertError } = await supabase
        .from("lecturer_forum_votes")
        .insert([voteData])
        .select()
        .single();

      if (insertError) {
        console.error("Error creating vote:", insertError);
        return NextResponse.json({ error: "Failed to create vote" }, { status: 500 });
      }

      return NextResponse.json({ vote: newVote, action: "created" }, { status: 201 });
    }
  } catch (error) {
    console.error("Vote API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

