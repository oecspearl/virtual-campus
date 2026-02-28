/**
 * Proctoring Session API
 * Create and manage proctoring sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProctoringSession, getProctoringSession, endProctoringSession } from '@/lib/proctoring/integration';
import { authenticateUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { quiz_id, assignment_id, course_id, session_type, browser_lock_config, remote_proctoring_config } = body;

    if (!session_type) {
      return NextResponse.json({ error: 'session_type is required' }, { status: 400 });
    }

    const sessionId = await createProctoringSession({
      quiz_id,
      assignment_id,
      student_id: authResult.user.id,
      course_id,
      session_type,
      browser_lock_config,
      remote_proctoring_config,
    });

    return NextResponse.json({ session_id: sessionId });
  } catch (error: any) {
    console.error('Proctoring session creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create session' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const session = await getProctoringSession(sessionId);
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check access
    if (session.student_id !== authResult.user.id) {
      // Check if user is instructor/admin
      if (authResult.userProfile?.role !== 'instructor' && 
          authResult.userProfile?.role !== 'admin' && 
          authResult.userProfile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(session);
  } catch (error: any) {
    console.error('Proctoring session get error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get session' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, action } = body;

    if (!session_id || !action) {
      return NextResponse.json({ error: 'session_id and action are required' }, { status: 400 });
    }

    if (action === 'end') {
      await endProctoringSession(session_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Proctoring session update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update session' }, { status: 500 });
  }
}

