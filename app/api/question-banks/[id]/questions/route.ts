/**
 * Question Bank Questions API
 * Manage questions within a question bank
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const difficulty = searchParams.get('difficulty');
    const tags = searchParams.get('tags')?.split(',');

    const supabase = createServiceSupabaseClient();

    // Check bank access
    const { data: bank } = await supabase
      .from('question_banks')
      .select('*')
      .eq('id', id)
      .single();

    if (!bank) {
      return NextResponse.json({ error: 'Question bank not found' }, { status: 404 });
    }

    // Check access permissions
    const hasAccess =
      bank.created_by === authResult.user.id ||
      bank.is_public ||
      bank.access_level === 'public' ||
      authResult.userProfile?.role === 'admin' ||
      authResult.userProfile?.role === 'super_admin';

    if (!hasAccess) {
      // Check shared access
      const { data: access } = await supabase
        .from('question_bank_access')
        .select('*')
        .eq('bank_id', id)
        .eq('user_id', authResult.user.id)
        .single();

      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get questions
    let query = supabase
      .from('question_bank_questions')
      .select('*')
      .eq('bank_id', id)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (tags && tags.length > 0) {
      query = query.contains('tags', tags);
    }

    const { data: questions, error } = await query;

    if (error) {
      console.error('Question bank questions query error:', error);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    return NextResponse.json(questions || []);
  } catch (error: any) {
    console.error('Question bank questions GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Check write access
    const supabase = createServiceSupabaseClient();
    const { data: bank } = await supabase
      .from('question_banks')
      .select('*')
      .eq('id', id)
      .single();

    if (!bank) {
      return NextResponse.json({ error: 'Question bank not found' }, { status: 404 });
    }

    const hasWriteAccess =
      bank.created_by === authResult.user.id ||
      authResult.userProfile?.role === 'admin' ||
      authResult.userProfile?.role === 'super_admin';

    if (!hasWriteAccess) {
      const { data: access } = await supabase
        .from('question_bank_access')
        .select('*')
        .eq('bank_id', id)
        .eq('user_id', authResult.user.id)
        .in('access_type', ['write', 'admin'])
        .single();

      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      type,
      question_text,
      points,
      options,
      correct_answer,
      case_sensitive,
      feedback_correct,
      feedback_incorrect,
      explanation,
      difficulty,
      subject_area,
      topic,
      tags,
      learning_objectives,
      bloom_taxonomy_level,
    } = body;

    if (!type || !question_text) {
      return NextResponse.json({ error: 'type and question_text are required' }, { status: 400 });
    }

    const { data: question, error } = await supabase
      .from('question_bank_questions')
      .insert({
        bank_id: id,
        created_by: authResult.user.id,
        type,
        question_text,
        points: points || 1,
        options: options || null,
        correct_answer: correct_answer || null,
        case_sensitive: case_sensitive || false,
        feedback_correct: feedback_correct || null,
        feedback_incorrect: feedback_incorrect || null,
        explanation: explanation || null,
        difficulty: difficulty || null,
        subject_area: subject_area || null,
        topic: topic || null,
        tags: tags || [],
        learning_objectives: learning_objectives || [],
        bloom_taxonomy_level: bloom_taxonomy_level || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Question creation error:', error);
      return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
    }

    return NextResponse.json(question, { status: 201 });
  } catch (error: any) {
    console.error('Question bank questions POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

