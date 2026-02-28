/**
 * Plagiarism Check API
 * Initiate plagiarism checks and get results
 */

import { NextRequest, NextResponse } from 'next/server';
import { launchTurnitinCheck, getPlagiarismCheck } from '@/lib/plagiarism/turnitin';
import { authenticateUser } from '@/lib/api-auth';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { submission_id, assignment_id, course_id, file_url, title } = body;

    if (!submission_id || !assignment_id || !course_id) {
      return NextResponse.json(
        { error: 'submission_id, assignment_id, and course_id are required' },
        { status: 400 }
      );
    }

    // Launch Turnitin check
    const launchJWT = await launchTurnitinCheck({
      submission_id,
      assignment_id,
      student_id: authResult.user.id,
      course_id,
      file_url,
      title,
    }, authResult.user.id, authResult.userProfile.role);

    return NextResponse.json({
      success: true,
      launch_jwt: launchJWT,
      message: 'Plagiarism check initiated'
    });
  } catch (error: any) {
    console.error('Plagiarism check error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initiate check' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const checkId = searchParams.get('check_id');
    const submissionId = searchParams.get('submission_id');

    if (!checkId && !submissionId) {
      return NextResponse.json({ error: 'check_id or submission_id is required' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    let query = supabase.from('plagiarism_checks').select('*');

    if (checkId) {
      query = query.eq('id', checkId);
    } else if (submissionId) {
      query = query.eq('submission_id', submissionId).order('created_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ error: 'Plagiarism check not found' }, { status: 404 });
    }

    // Check access
    if (data.student_id !== authResult.user.id) {
      if (authResult.userProfile?.role !== 'instructor' && 
          authResult.userProfile?.role !== 'admin' && 
          authResult.userProfile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Plagiarism check get error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get check' }, { status: 500 });
  }
}

