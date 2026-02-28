import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// POST /api/discussions/vote - Vote on a discussion or reply
export async function POST(request: Request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const body = await request.json();
    const { discussion_id, reply_id, vote_type } = body;

    if (!vote_type || !['up', 'down'].includes(vote_type)) {
      return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
    }

    if (!discussion_id && !reply_id) {
      return NextResponse.json({ error: "Either discussion_id or reply_id is required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user already voted
    const { data: existingVote, error: fetchError } = await tq
      .from('discussion_votes')
      .select('*')
      .eq('user_id', user.id)
      .eq(discussion_id ? 'discussion_id' : 'reply_id', discussion_id || reply_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing vote:', fetchError);
      return NextResponse.json({ error: "Failed to check existing vote" }, { status: 500 });
    }

    if (existingVote) {
      // Update existing vote
      if (existingVote.vote_type === vote_type) {
        // Remove vote if same type
        const { error: deleteError } = await tq
          .from('discussion_votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) {
          console.error('Error removing vote:', deleteError);
          return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 });
        }

        console.log('Vote removed successfully');
        return NextResponse.json({ action: 'removed' });
      } else {
        // Update vote type
        const { error: updateError } = await tq
          .from('discussion_votes')
          .update({ vote_type })
          .eq('id', existingVote.id);

        if (updateError) {
          console.error('Error updating vote:', updateError);
          return NextResponse.json({ error: "Failed to update vote" }, { status: 500 });
        }

        console.log('Vote updated successfully');
        return NextResponse.json({ action: 'updated', vote_type });
      }
    } else {
      // Create new vote
      const { error: insertError } = await tq
        .from('discussion_votes')
        .insert([{
          discussion_id: discussion_id || null,
          reply_id: reply_id || null,
          user_id: user.id,
          vote_type
        }]);

      if (insertError) {
        console.error('Error creating vote:', insertError);
        return NextResponse.json({ error: "Failed to create vote" }, { status: 500 });
      }

      console.log('Vote created successfully');
      return NextResponse.json({ action: 'created', vote_type });
    }

  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
