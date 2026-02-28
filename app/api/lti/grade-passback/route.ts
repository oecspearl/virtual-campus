/**
 * LTI 1.3 Grade Passback Endpoint
 * Handles grade submissions from LTI tools
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAccessToken } from '@/lib/lti/oauth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const tokenInfo = await validateAccessToken(token);
    
    if (!tokenInfo) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    // Check for grade passback scope
    if (!tokenInfo.scopes.includes('https://purl.imsglobal.org/spec/lti-ags/scope/score')) {
      return NextResponse.json(
        { error: 'Insufficient permissions for grade passback' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      userId, 
      scoreGiven, 
      scoreMaximum, 
      comment, 
      activityProgress, 
      gradingProgress,
      timestamp,
      lineItemId,
      courseId,
      assignmentId,
    } = body;

    if (!userId || scoreGiven === undefined || scoreMaximum === undefined) {
      return NextResponse.json(
        { error: 'Missing required grade fields' },
        { status: 400 }
      );
    }

    // Find the most recent launch for this user and tool
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: launch } = await tq.from('lti_launches')
      .select('id, course_id, user_id')
      .eq('tool_id', tokenInfo.tool_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!launch) {
      return NextResponse.json(
        { error: 'No launch found for this user and tool' },
        { status: 404 }
      );
    }

    // Store grade passback
    const { data: gradePassback, error: insertError } = await tq.from('lti_grade_passback')
      .insert({
        launch_id: launch.id,
        tool_id: tokenInfo.tool_id,
        user_id: userId,
        course_id: courseId || launch.course_id || null,
        assignment_id: assignmentId || null,
        lineitem_id: lineItemId || null,
        score_given: scoreGiven,
        score_maximum: scoreMaximum,
        comment: comment || null,
        activity_progress: activityProgress || 'Completed',
        grading_progress: gradingProgress || 'FullyGraded',
        timestamp: timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Grade passback insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to store grade' },
        { status: 500 }
      );
    }

    // If assignment_id is provided, update the assignment grade
    if (assignmentId) {
      const scorePercentage = (scoreGiven / scoreMaximum) * 100;
      
      // Find or create assignment submission
      const { data: submission } = await tq.from('assignment_submissions')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('student_id', userId)
        .single();

      if (submission) {
        // Update existing submission
        await tq.from('assignment_submissions')
          .update({
            grade: scorePercentage,
            feedback: comment || null,
            graded_at: new Date().toISOString(),
            status: 'graded',
          })
          .eq('id', submission.id);
      } else {
        // Create new submission
        await tq.from('assignment_submissions')
          .insert({
            assignment_id: assignmentId,
            student_id: userId,
            grade: scorePercentage,
            feedback: comment || null,
            graded_at: new Date().toISOString(),
            status: 'graded',
            submitted_at: new Date().toISOString(),
            submission_type: 'text', // Default type
          });
      }
    }

    return NextResponse.json({
      success: true,
      grade_id: gradePassback.id,
    });
  } catch (error) {
    console.error('Grade passback error:', error);
    return NextResponse.json(
      { error: 'Failed to process grade passback' },
      { status: 500 }
    );
  }
}

