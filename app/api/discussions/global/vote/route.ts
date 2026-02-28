import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// POST /api/discussions/global/vote - Vote on a discussion or reply
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;

    const body = await request.json();
    const { discussion_id, reply_id, vote_type } = body;

    // Validate inputs
    if (!discussion_id && !reply_id) {
      return NextResponse.json(
        { error: "Either discussion_id or reply_id is required" },
        { status: 400 }
      );
    }

    if (discussion_id && reply_id) {
      return NextResponse.json(
        { error: "Cannot vote on both discussion and reply at the same time" },
        { status: 400 }
      );
    }

    if (!["up", "down"].includes(vote_type)) {
      return NextResponse.json(
        { error: "vote_type must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user already voted
    let existingVoteQuery = tq
      .from("global_discussion_votes")
      .select("id, vote_type")
      .eq("user_id", user.id);

    if (discussion_id) {
      existingVoteQuery = existingVoteQuery.eq("discussion_id", discussion_id);
    } else {
      existingVoteQuery = existingVoteQuery.eq("reply_id", reply_id);
    }

    const { data: existingVote } = await existingVoteQuery.single();

    let action: string;
    let newVoteType: string | null = null;

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        // Same vote type - remove the vote (toggle off)
        const { error: deleteError } = await tq
          .from("global_discussion_votes")
          .delete()
          .eq("id", existingVote.id);

        if (deleteError) {
          console.error("Error removing vote:", deleteError);
          return NextResponse.json(
            { error: "Failed to remove vote" },
            { status: 500 }
          );
        }

        action = "removed";
      } else {
        // Different vote type - update the vote
        const { error: updateError } = await tq
          .from("global_discussion_votes")
          .update({ vote_type })
          .eq("id", existingVote.id);

        if (updateError) {
          console.error("Error updating vote:", updateError);
          return NextResponse.json(
            { error: "Failed to update vote" },
            { status: 500 }
          );
        }

        action = "updated";
        newVoteType = vote_type;
      }
    } else {
      // No existing vote - create new vote
      const voteData: Record<string, any> = {
        user_id: user.id,
        vote_type,
      };

      if (discussion_id) {
        voteData.discussion_id = discussion_id;
      } else {
        voteData.reply_id = reply_id;
      }

      const { error: insertError } = await tq
        .from("global_discussion_votes")
        .insert([voteData]);

      if (insertError) {
        console.error("Error creating vote:", insertError);
        return NextResponse.json(
          { error: "Failed to create vote" },
          { status: 500 }
        );
      }

      action = "created";
      newVoteType = vote_type;
    }

    // Get updated vote count
    let voteCountQuery;
    if (discussion_id) {
      voteCountQuery = tq
        .from("global_discussions")
        .select("vote_count")
        .eq("id", discussion_id)
        .single();
    } else {
      voteCountQuery = tq
        .from("global_discussion_replies")
        .select("vote_count")
        .eq("id", reply_id)
        .single();
    }

    const { data: voteCountData } = await voteCountQuery;

    return NextResponse.json({
      action,
      vote_type: newVoteType,
      vote_count: voteCountData?.vote_count || 0,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
