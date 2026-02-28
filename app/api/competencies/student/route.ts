import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/competencies/student
 * Get the current student's competency profile
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const studentId = searchParams.get('student_id'); // For instructors/admins

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceSupabaseClient();

    // Determine which student to get competencies for
    let targetStudentId = user.id;

    if (studentId && studentId !== user.id) {
      // Check if user is admin or instructor
      const { data: profile } = await serviceSupabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'instructor'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      targetStudentId = studentId;
    }

    // Get all competencies
    let competencyQuery = serviceSupabase
      .from('competencies')
      .select('id, name, description, category, level')
      .is('parent_id', null) // Top-level only
      .order('category')
      .order('name');

    if (category) {
      competencyQuery = competencyQuery.eq('category', category);
    }

    const { data: competencies } = await competencyQuery;

    // Get student's competency levels
    const { data: studentCompetencies } = await serviceSupabase
      .from('student_competencies')
      .select('competency_id, current_level, evidence, updated_at')
      .eq('student_id', targetStudentId);

    const studentCompMap = new Map(
      studentCompetencies?.map(sc => [sc.competency_id, sc]) || []
    );

    // Combine competencies with student levels
    const competenciesWithLevels = competencies?.map(c => {
      const studentComp = studentCompMap.get(c.id);
      return {
        ...c,
        current_level: studentComp?.current_level || 0,
        evidence: studentComp?.evidence || [],
        last_updated: studentComp?.updated_at,
      };
    }) || [];

    // Group by category for radar chart
    const byCategory: Record<string, typeof competenciesWithLevels> = {};
    competenciesWithLevels.forEach(c => {
      const cat = c.category || 'Uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(c);
    });

    // Calculate overall stats
    const totalCompetencies = competenciesWithLevels.length;
    const acquiredCompetencies = competenciesWithLevels.filter(c => c.current_level > 0).length;
    const masteredCompetencies = competenciesWithLevels.filter(c => c.current_level >= 0.8).length;
    const averageLevel = totalCompetencies > 0
      ? competenciesWithLevels.reduce((sum, c) => sum + c.current_level, 0) / totalCompetencies
      : 0;

    return NextResponse.json({
      student_id: targetStudentId,
      stats: {
        total_competencies: totalCompetencies,
        acquired_competencies: acquiredCompetencies,
        mastered_competencies: masteredCompetencies,
        average_level: Math.round(averageLevel * 100) / 100,
      },
      competencies: competenciesWithLevels,
      by_category: byCategory,
    });
  } catch (error) {
    console.error('Error in student competencies GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/competencies/student
 * Update a student's competency level (for instructors/admins)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceSupabaseClient();

    // Check if user is admin or instructor
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'instructor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, competency_id, level, evidence } = body;

    if (!student_id || !competency_id) {
      return NextResponse.json({
        error: 'student_id and competency_id are required'
      }, { status: 400 });
    }

    if (level !== undefined && (level < 0 || level > 1)) {
      return NextResponse.json({
        error: 'Level must be between 0 and 1'
      }, { status: 400 });
    }

    // Update using the helper function or direct upsert
    const updateData: Record<string, unknown> = {
      student_id,
      competency_id,
      updated_at: new Date().toISOString(),
    };

    if (level !== undefined) {
      updateData.current_level = level;
    }

    if (evidence) {
      // Append to existing evidence
      const { data: existing } = await serviceSupabase
        .from('student_competencies')
        .select('evidence')
        .eq('student_id', student_id)
        .eq('competency_id', competency_id)
        .single();

      const existingEvidence = existing?.evidence || [];
      updateData.evidence = [...existingEvidence, {
        ...evidence,
        added_at: new Date().toISOString(),
        added_by: user.id,
      }];
    }

    const { data: studentCompetency, error } = await serviceSupabase
      .from('student_competencies')
      .upsert(updateData, {
        onConflict: 'student_id,competency_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating student competency:', error);
      return NextResponse.json({ error: 'Failed to update competency' }, { status: 500 });
    }

    return NextResponse.json({ competency: studentCompetency });
  } catch (error) {
    console.error('Error in student competencies PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
