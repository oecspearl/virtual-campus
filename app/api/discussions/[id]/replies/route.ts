import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { notifyDiscussionReply } from "@/lib/notifications";

// POST /api/discussions/[id]/replies - Create a new reply
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;
    console.log('Creating reply for discussion:', discussionId);

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const body = await request.json();
    const { content, parent_reply_id, is_solution = false } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if discussion exists and get course info
    const { data: discussion, error: discussionError } = await tq
      .from('course_discussions')
      .select(`
        is_locked,
        author_id,
        course_id,
        title,
        courses!inner(title)
      `)
      .eq('id', discussionId)
      .single();

    if (discussionError) {
      console.error('Error fetching discussion:', discussionError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    if (discussion.is_locked) {
      return NextResponse.json({ error: "This discussion is locked" }, { status: 403 });
    }

    // If this is a solution, mark other solutions as not solutions
    if (is_solution) {
      await tq
        .from('discussion_replies')
        .update({ is_solution: false })
        .eq('discussion_id', discussionId);
    }

    const { data: reply, error } = await tq
      .from('discussion_replies')
      .insert([{
        discussion_id: discussionId,
        parent_reply_id: parent_reply_id || null,
        author_id: user.id,
        content: content.trim(),
        is_solution
      }])
      .select(`
        *,
        author:users!discussion_replies_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating reply:', error);
      return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
    }

    // Send notification to discussion author and other participants (if not replying to yourself)
    if (discussion && reply && discussion.author_id !== user.id) {
      try {
        // Use the same tenant-scoped query for notification lookups
        
        // Get course title
        const courseTitle = (discussion.courses as any)?.title || 'Course';
        
        // Get reply author name
        const replyAuthor = (reply.author as any);
        const replyAuthorName = replyAuthor?.name || 'Someone';
        
        // Strip HTML from reply content (first 150 chars)
        const plainContent = content.replace(/<[^>]*>/g, '').substring(0, 150);
        
        const discussionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://oecsmypd.org'}/courses/${discussion.course_id}/discussions/${discussionId}`;
        
        // Notify discussion author
        await notifyDiscussionReply(discussion.author_id, {
          replyAuthorName,
          discussionTitle: discussion.title,
          courseTitle,
          replyContent: plainContent,
          discussionUrl,
        }).catch(err => console.error('Failed to notify discussion author:', err));

        // Track who we've notified to avoid duplicates
        const notifiedUserIds = new Set([user.id, discussion.author_id]);

        // Also notify parent reply author if this is a nested reply
        if (parent_reply_id) {
          const { data: parentReply } = await tq
            .from('discussion_replies')
            .select('author_id')
            .eq('id', parent_reply_id)
            .single();

          if (parentReply && !notifiedUserIds.has(parentReply.author_id)) {
            await notifyDiscussionReply(parentReply.author_id, {
              replyAuthorName,
              discussionTitle: discussion.title,
              courseTitle,
              replyContent: plainContent,
              discussionUrl,
            }).catch(err => console.error('Failed to notify parent reply author:', err));
            
            notifiedUserIds.add(parentReply.author_id);
          }
        }

        // Get other participants who have replied to this discussion (to notify them)
        const { data: otherReplies } = await tq
          .from('discussion_replies')
          .select('author_id')
          .eq('discussion_id', discussionId)
          .neq('author_id', user.id)
          .neq('author_id', discussion.author_id);

        if (otherReplies) {
          // Get unique participant IDs, excluding those already notified
          const uniqueParticipants = [...new Set(
            otherReplies
              .map(r => r.author_id)
              .filter(id => !notifiedUserIds.has(id))
          )];

          // Notify other participants (limit to 10 to avoid spam)
          for (const participantId of uniqueParticipants.slice(0, 10)) {
            await notifyDiscussionReply(participantId, {
              replyAuthorName,
              discussionTitle: discussion.title,
              courseTitle,
              replyContent: plainContent,
              discussionUrl,
            }).catch(err => console.error(`Failed to notify participant ${participantId}:`, err));
          }
        }
      } catch (notificationError) {
        // Don't fail the reply creation if notifications fail
        console.error('Error sending reply notifications:', notificationError);
      }
    }

    console.log('Reply created successfully:', reply.id);
    return NextResponse.json(reply);

  } catch (error) {
    console.error('Create reply error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
