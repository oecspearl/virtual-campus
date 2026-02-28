/**
 * Question Banks API
 * Manage question banks (shared question repositories)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const accessLevel = searchParams.get('access_level');
    const subjectArea = searchParams.get('subject_area');
    const tags = searchParams.get('tags')?.split(',');

    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from('question_banks')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters based on access
    if (accessLevel === 'public' || authResult.userProfile?.role === 'admin' || authResult.userProfile?.role === 'super_admin') {
      // Admins can see all
    } else {
      // Regular users see their own, shared, and public banks
      query = query.or(`created_by.eq.${authResult.user.id},is_public.eq.true,access_level.eq.public`);
    }

    if (accessLevel) {
      query = query.eq('access_level', accessLevel);
    }

    if (subjectArea) {
      query = query.eq('subject_area', subjectArea);
    }

    if (tags && tags.length > 0) {
      query = query.contains('tags', tags);
    }

    const { data: banks, error } = await query;

    if (error) {
      console.error('Question banks query error:', error);
      return NextResponse.json({ error: 'Failed to fetch question banks' }, { status: 500 });
    }

    return NextResponse.json(banks || []);
  } catch (error: any) {
    console.error('Question banks GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only instructors and above can create question banks
    if (authResult.userProfile.role !== 'instructor' && 
        authResult.userProfile.role !== 'admin' && 
        authResult.userProfile.role !== 'super_admin' &&
        authResult.userProfile.role !== 'curriculum_designer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, access_level, subject_area, grade_level, tags } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    const { data: bank, error } = await supabase
      .from('question_banks')
      .insert({
        name,
        description: description || null,
        created_by: authResult.user.id,
        access_level: access_level || 'private',
        is_public: access_level === 'public',
        is_shared: access_level === 'shared',
        subject_area: subject_area || null,
        grade_level: grade_level || null,
        tags: tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Question bank creation error:', error);
      return NextResponse.json({ error: 'Failed to create question bank' }, { status: 500 });
    }

    return NextResponse.json(bank, { status: 201 });
  } catch (error: any) {
    console.error('Question banks POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

