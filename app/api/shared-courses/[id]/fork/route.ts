import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { requireAcceptedShare } from '@/lib/share-validation';

/**
 * POST /api/shared-courses/[id]/fork
 *
 * Cross-tenant clone. Copies the source course (and its lessons, sections,
 * quizzes + questions, assignments, grade items, gradebook settings, and
 * competencies) into the caller's tenant as a brand-new, unpublished course.
 * The new course records provenance via forked_from_course_id /
 * forked_from_tenant_id so "Forked from {Institution}" can be shown.
 *
 * Requires:
 *   - active share (not revoked)
 *   - share.allow_fork = true
 *   - caller role in [admin, super_admin, tenant_admin, curriculum_designer, instructor]
 *
 * Body:
 *   title? — optional override for the new course title
 *   revoke_share? — if true, revoke the share after a successful fork (clean handoff)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const callerRole = authResult.userProfile!.role;
    if (!hasRole(callerRole, ['admin', 'super_admin', 'tenant_admin', 'curriculum_designer', 'instructor'])) {
      return NextResponse.json({ error: 'Insufficient permissions to fork a shared course' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const raw = tq.raw;

    // 1. Validate share + require acceptance
    const shareValidation = await requireAcceptedShare(shareId, tenantId);
    if (!shareValidation.valid) {
      return NextResponse.json({ error: shareValidation.error }, { status: 404 });
    }
    const share = shareValidation.share!;
    if (!share.allow_fork) {
      return NextResponse.json(
        { error: 'This course cannot be forked. Ask the source institution to enable forking on the share.' },
        { status: 403 }
      );
    }

    // Parse optional body
    let newTitle: string | null = null;
    let revokeAfterFork = false;
    try {
      const body = await request.json();
      newTitle = body?.title || null;
      revokeAfterFork = !!body?.revoke_share;
    } catch {
      // no body is fine
    }

    // 2. Read source course (raw — cross-tenant)
    const { data: sourceCourse, error: sourceCourseErr } = await raw
      .from('courses')
      .select('*')
      .eq('id', share.course_id)
      .single();

    if (sourceCourseErr || !sourceCourse) {
      return NextResponse.json({ error: 'Source course not found' }, { status: 404 });
    }

    // 3. Insert new course in target tenant
    const {
      id: _id,
      tenant_id: _tid,
      created_at: _ca,
      updated_at: _ua,
      forked_from_course_id: _ffcid,
      forked_from_tenant_id: _ffttid,
      forked_at: _fa,
      ...courseFields
    } = sourceCourse;

    const { data: newCourse, error: createErr } = await tq
      .from('courses')
      .insert([{
        ...courseFields,
        title: newTitle || `${sourceCourse.title} (forked)`,
        published: false,
        featured: false,
        forked_from_course_id: sourceCourse.id,
        forked_from_tenant_id: share.source_tenant_id,
        forked_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (createErr || !newCourse) {
      console.error('Fork: failed to create course', createErr);
      return NextResponse.json({ error: 'Failed to create forked course' }, { status: 500 });
    }

    // Add the forking user as an instructor in the new tenant
    await tq.from('course_instructors').insert([{ course_id: newCourse.id, instructor_id: authResult.user!.id }]);

    // 4. Clone sections (source → target)
    const sectionIdMap = new Map<string, string>();
    const { data: sourceSections } = await raw
      .from('course_sections')
      .select('*')
      .eq('course_id', share.course_id)
      .order('order', { ascending: true });

    for (const sec of sourceSections || []) {
      const { id: _sid, tenant_id: _stid, course_id: _scid, created_at: _sca, updated_at: _sua, ...sf } = sec;
      const { data: newSec } = await tq
        .from('course_sections')
        .insert([{ ...sf, course_id: newCourse.id }])
        .select()
        .single();
      if (newSec) sectionIdMap.set(sec.id, newSec.id);
    }

    // 5. Clone lessons
    const lessonIdMap = new Map<string, string>();
    const { data: sourceLessons } = await raw
      .from('lessons')
      .select('*')
      .eq('course_id', share.course_id)
      .order('order', { ascending: true });

    for (const lesson of sourceLessons || []) {
      const {
        id: _lid, tenant_id: _ltid, course_id: _lcid, created_at: _lca, updated_at: _lua,
        prerequisite_lesson_id: _prereq, section_id: origSectionId,
        ...lf
      } = lesson;
      const { data: newLesson } = await tq
        .from('lessons')
        .insert([{
          ...lf,
          course_id: newCourse.id,
          published: false,
          prerequisite_lesson_id: null,
          section_id: origSectionId ? sectionIdMap.get(origSectionId) || null : null,
        }])
        .select()
        .single();
      if (newLesson) lessonIdMap.set(lesson.id, newLesson.id);
    }

    // Second pass: remap prerequisite_lesson_id now that we have the map
    for (const lesson of sourceLessons || []) {
      if (lesson.prerequisite_lesson_id && lessonIdMap.has(lesson.prerequisite_lesson_id)) {
        const newLessonId = lessonIdMap.get(lesson.id);
        const newPrereqId = lessonIdMap.get(lesson.prerequisite_lesson_id);
        if (newLessonId && newPrereqId) {
          await tq.from('lessons').update({ prerequisite_lesson_id: newPrereqId }).eq('id', newLessonId);
        }
      }
    }

    // 6. Clone quizzes + questions
    const quizIdMap = new Map<string, string>();
    const { data: sourceQuizzes } = await raw
      .from('quizzes')
      .select('*')
      .eq('course_id', share.course_id);

    for (const quiz of sourceQuizzes || []) {
      const {
        id: _qid, tenant_id: _qtid, course_id: _qcid, class_id: _qclid,
        created_at: _qca, updated_at: _qua, creator_id: _qcrid,
        lesson_id: origLessonId,
        ...qf
      } = quiz;
      const { data: newQuiz } = await tq
        .from('quizzes')
        .insert([{
          ...qf,
          course_id: newCourse.id,
          lesson_id: origLessonId ? lessonIdMap.get(origLessonId) || null : null,
          class_id: null,
          creator_id: authResult.user!.id,
        }])
        .select()
        .single();
      if (newQuiz) quizIdMap.set(quiz.id, newQuiz.id);
    }

    for (const [origQuizId, newQuizId] of quizIdMap) {
      const { data: sourceQuestions } = await raw
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', origQuizId)
        .order('order', { ascending: true });
      const inserts = (sourceQuestions || []).map((q: any) => {
        const { id: _qqid, tenant_id: _qqtid, quiz_id: _qqzid, created_at: _qqca, updated_at: _qqua, ...qf } = q;
        return { ...qf, quiz_id: newQuizId };
      });
      if (inserts.length > 0) await tq.from('quiz_questions').insert(inserts);
    }

    // 7. Clone assignments
    const { data: sourceAssignments } = await raw
      .from('assignments')
      .select('*')
      .eq('course_id', share.course_id);

    const assignmentInserts = (sourceAssignments || []).map((a: any) => {
      const {
        id: _aid, tenant_id: _atid, course_id: _acid, class_id: _aclid,
        created_at: _aca, updated_at: _aua, creator_id: _acrid,
        lesson_id: origLessonId,
        ...af
      } = a;
      return {
        ...af,
        course_id: newCourse.id,
        lesson_id: origLessonId ? lessonIdMap.get(origLessonId) || null : null,
        class_id: null,
        creator_id: authResult.user!.id,
      };
    });
    if (assignmentInserts.length > 0) await tq.from('assignments').insert(assignmentInserts);

    // 8. Clone grade items (best-effort)
    const { data: sourceGradeItems } = await raw
      .from('course_grade_items')
      .select('*')
      .eq('course_id', share.course_id);
    const gradeItemInserts = (sourceGradeItems || []).map((g: any) => ({
      course_id: newCourse.id,
      name: g.name,
      type: g.type,
      weight: g.weight,
      max_score: g.max_score,
      category: g.category,
      order: g.order,
      assessment_id: null,
    }));
    if (gradeItemInserts.length > 0) await tq.from('course_grade_items').insert(gradeItemInserts);

    // 9. Clone gradebook settings
    const { data: sourceSettings } = await raw
      .from('course_gradebook_settings')
      .select('*')
      .eq('course_id', share.course_id)
      .maybeSingle();
    if (sourceSettings) {
      const { id: _sid, tenant_id: _stid, course_id: _scid, created_at: _sca, updated_at: _sua, ...sf } = sourceSettings;
      await tq.from('course_gradebook_settings').insert([{ ...sf, course_id: newCourse.id }]);
    }

    // 10. Clone competencies (by reference — competency_id is global)
    const { data: sourceComps } = await raw
      .from('course_competencies')
      .select('*')
      .eq('course_id', share.course_id);
    const compInserts = (sourceComps || []).map((c: any) => ({
      course_id: newCourse.id,
      competency_id: c.competency_id,
      proficiency_level: c.proficiency_level,
      is_primary: c.is_primary,
    }));
    if (compInserts.length > 0) await tq.from('course_competencies').insert(compInserts);

    // 11. Clone course-level resource links
    const { data: sourceResourceLinks } = await raw
      .from('resource_links')
      .select('*')
      .eq('course_id', share.course_id)
      .is('lesson_id', null);
    const rlInserts = (sourceResourceLinks || []).map((r: any) => {
      const { id: _rid, tenant_id: _rtid, course_id: _rcid, created_at: _rca, updated_at: _rua, ...rf } = r;
      return { ...rf, course_id: newCourse.id, lesson_id: null };
    });
    if (rlInserts.length > 0) await tq.from('resource_links').insert(rlInserts);

    // 12. Optionally revoke the share
    if (revokeAfterFork) {
      await raw
        .from('course_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', shareId);
    }

    return NextResponse.json({
      success: true,
      course: newCourse,
      counts: {
        sections: sectionIdMap.size,
        lessons: lessonIdMap.size,
        quizzes: quizIdMap.size,
        assignments: assignmentInserts.length,
        grade_items: gradeItemInserts.length,
        competencies: compInserts.length,
        resource_links: rlInserts.length,
      },
      revoked: revokeAfterFork,
    });
  } catch (error: any) {
    console.error('Fork error:', error);
    return NextResponse.json({ error: `Fork failed: ${error?.message || 'Unknown error'}` }, { status: 500 });
  }
}
