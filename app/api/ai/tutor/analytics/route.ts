import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');
    const timeRange = searchParams.get('timeRange') || '7d'; // 7d, 30d, 90d, all

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Build date filter based on time range
    let dateFilter = '';
    const now = new Date();
    switch (timeRange) {
      case '7d':
        dateFilter = `created_at >= '${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()}'`;
        break;
      case '30d':
        dateFilter = `created_at >= '${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()}'`;
        break;
      case '90d':
        dateFilter = `created_at >= '${new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()}'`;
        break;
      default:
        dateFilter = '';
    }

    // Get conversation analytics
    let conversationQuery = tq
      .from("ai_tutor_conversations")
      .select("*")
      .eq("student_id", user.id);

    if (courseId) {
      conversationQuery = conversationQuery.eq("course_id", courseId);
    }
    if (lessonId) {
      conversationQuery = conversationQuery.eq("lesson_id", lessonId);
    }
    if (dateFilter) {
      conversationQuery = conversationQuery.gte("created_at", dateFilter.split("'")[1]);
    }

    const { data: conversations, error: conversationsError } = await conversationQuery;

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }

    // Calculate analytics
    const analytics = {
      totalInteractions: conversations?.length || 0,
      questionsAsked: conversations?.length || 0,
      responseTypes: {
        explanation: conversations?.filter(c => c.response_type === 'explanation').length || 0,
        example: conversations?.filter(c => c.response_type === 'example').length || 0,
        help: conversations?.filter(c => c.response_type === 'help').length || 0,
        practice: conversations?.filter(c => c.response_type === 'practice').length || 0,
        summary: conversations?.filter(c => c.response_type === 'summary').length || 0,
        general: conversations?.filter(c => c.response_type === 'general').length || 0
      },
      mostActiveLessons: getMostActiveLessons(conversations || []),
      averageSessionLength: calculateAverageSessionLength(conversations || []),
      satisfactionRating: calculateSatisfactionRating(conversations || []),
      timeRange,
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (e: any) {
    console.error('AI tutor analytics API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { lessonId, courseId, interactionType, satisfactionRating } = await request.json();

    if (!lessonId || !interactionType) {
      return NextResponse.json({ error: "Lesson ID and interaction type required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Update or create analytics record
    const { data: existingAnalytics } = await tq
      .from("ai_tutor_analytics")
      .select("*")
      .eq("student_id", user.id)
      .eq("lesson_id", lessonId)
      .single();

    const updateData: any = {
      student_id: user.id,
      lesson_id: lessonId,
      course_id: courseId,
      interaction_count: (existingAnalytics?.interaction_count || 0) + 1,
      questions_asked: (existingAnalytics?.questions_asked || 0) + 1,
      updated_at: new Date().toISOString()
    };

    // Update specific counters based on interaction type
    switch (interactionType) {
      case 'explanation':
        updateData.concepts_explained = (existingAnalytics?.concepts_explained || 0) + 1;
        break;
      case 'example':
        updateData.examples_requested = (existingAnalytics?.examples_requested || 0) + 1;
        break;
      case 'help':
        updateData.help_requests = (existingAnalytics?.help_requests || 0) + 1;
        break;
      case 'practice':
        updateData.practice_requests = (existingAnalytics?.practice_requests || 0) + 1;
        break;
    }

    if (satisfactionRating) {
      updateData.satisfaction_rating = satisfactionRating;
    }

    const { data, error } = await tq
      .from("ai_tutor_analytics")
      .upsert([updateData], {
        onConflict: 'student_id,lesson_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating analytics:', error);
      return NextResponse.json({ error: "Failed to update analytics" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      analytics: data
    });

  } catch (e: any) {
    console.error('AI tutor analytics POST API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper functions
function getMostActiveLessons(conversations: any[]): any[] {
  const lessonCounts: Record<string, { lessonId: string; count: number; lessonTitle?: string }> = {};
  
  conversations.forEach(conv => {
    if (!lessonCounts[conv.lesson_id]) {
      lessonCounts[conv.lesson_id] = {
        lessonId: conv.lesson_id,
        count: 0
      };
    }
    lessonCounts[conv.lesson_id].count++;
  });

  return Object.values(lessonCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function calculateAverageSessionLength(conversations: any[]): number {
  if (conversations.length === 0) return 0;
  
  // Group conversations by session (same day)
  const sessions: Record<string, any[]> = {};
  conversations.forEach(conv => {
    const date = new Date(conv.created_at).toDateString();
    if (!sessions[date]) {
      sessions[date] = [];
    }
    sessions[date].push(conv);
  });

  // Calculate average session length
  const sessionLengths = Object.values(sessions).map(session => session.length);
  return sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length;
}

function calculateSatisfactionRating(conversations: any[]): number {
  const ratedConversations = conversations.filter(conv => conv.satisfaction_rating);
  if (ratedConversations.length === 0) return 0;
  
  const totalRating = ratedConversations.reduce((sum, conv) => sum + conv.satisfaction_rating, 0);
  return totalRating / ratedConversations.length;
}
