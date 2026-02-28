import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// DELETE /api/discussions/[id]/replies/[replyId] - Delete a course discussion reply
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const { id: discussionId, replyId } = await params;

    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const isAdmin = userProfile?.role &&
      ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check reply exists and belongs to this discussion
    const { data: existingReply, error: fetchError } = await tq
      .from('discussion_replies')
      .select('id, author_id, discussion_id')
      .eq('id', replyId)
      .eq('discussion_id', discussionId)
      .single();

    if (fetchError || !existingReply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (existingReply.author_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: "You can only delete your own replies" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await tq
      .from('discussion_replies')
      .delete()
      .eq('id', replyId);

    if (deleteError) {
      console.error('Error deleting course discussion reply:', deleteError);
      return NextResponse.json({ error: "Failed to delete reply" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete course discussion reply error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
