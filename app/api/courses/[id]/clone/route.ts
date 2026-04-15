import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;

    // Check permissions - only instructors, curriculum designers, and admins can clone
    if (!hasRole(userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Parse request body for optional new title
    let newTitle: string | null = null;
    try {
      const body = await request.json();
      newTitle = body.title || null;
    } catch {
      // No body provided, that's fine
    }

    // Fetch original course
    const { data: originalCourse, error: courseError } = await tq
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !originalCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Create new course using spread to capture all fields (including any added later)
    const {
      id: _id,
      tenant_id: _tid,
      created_at: _ca,
      updated_at: _ua,
      ...courseFieldsToCopy
    } = originalCourse;

    const newCourseData = {
      ...courseFieldsToCopy,
      title: newTitle || `Copy of ${originalCourse.title}`,
      published: false, // Always start as unpublished
      featured: false,
    };

    const { data: newCourse, error: createError } = await tq
      .from('courses')
      .insert([newCourseData])
      .select()
      .single();

    if (createError || !newCourse) {
      console.error('Error creating cloned course:', createError);
      return NextResponse.json({ error: "Failed to create course copy" }, { status: 500 });
    }

    // Add the cloning user as an instructor
    await tq
      .from('course_instructors')
      .insert([{
        course_id: newCourse.id,
        instructor_id: user.id,
      }]);

    // Clone lessons using spread to capture all fields
    const { data: originalLessons } = await tq
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    const lessonIdMap: Record<string, string> = {};

    if (originalLessons && originalLessons.length > 0) {
      for (const lesson of originalLessons) {
        const {
          id: _lid,
          tenant_id: _ltid,
          course_id: _lcid,
          created_at: _lca,
          updated_at: _lua,
          prerequisite_lesson_id: _prereq, // Will update after all lessons created
          ...lessonFieldsToCopy
        } = lesson;

        const newLessonData = {
          ...lessonFieldsToCopy,
          course_id: newCourse.id,
          published: false, // Start unpublished
          prerequisite_lesson_id: null,
        };

        const { data: newLesson, error: lessonError } = await tq
          .from('lessons')
          .insert([newLessonData])
          .select()
          .single();

        if (newLesson) {
          lessonIdMap[lesson.id] = newLesson.id;
        } else {
          console.error('Error cloning lesson:', lessonError);
        }
      }

      // Update prerequisite references for cloned lessons
      for (const lesson of originalLessons) {
        if (lesson.prerequisite_lesson_id && lessonIdMap[lesson.prerequisite_lesson_id]) {
          const newLessonId = lessonIdMap[lesson.id];
          const newPrereqId = lessonIdMap[lesson.prerequisite_lesson_id];

          if (newLessonId) {
            await tq
              .from('lessons')
              .update({ prerequisite_lesson_id: newPrereqId })
              .eq('id', newLessonId);
          }
        }
      }
    }

    // Clone course grade items — batch insert
    const { data: originalGradeItems } = await tq
      .from('course_grade_items')
      .select('*')
      .eq('course_id', courseId);

    if (originalGradeItems && originalGradeItems.length > 0) {
      const gradeItemInserts = originalGradeItems.map(item => ({
        course_id: newCourse.id,
        name: item.name,
        type: item.type,
        weight: item.weight,
        max_score: item.max_score,
        category: item.category,
        order: item.order,
        assessment_id: null, // Don't link to original assessments
      }));

      await tq.from('course_grade_items').insert(gradeItemInserts);
    }

    // Clone gradebook settings
    const { data: originalSettings } = await tq
      .from('course_gradebook_settings')
      .select('*')
      .eq('course_id', courseId)
      .single();

    if (originalSettings) {
      const {
        id: _sid,
        tenant_id: _stid,
        course_id: _scid,
        created_at: _sca,
        updated_at: _sua,
        ...settingsFields
      } = originalSettings;

      await tq
        .from('course_gradebook_settings')
        .insert([{
          ...settingsFields,
          course_id: newCourse.id,
        }]);
    }

    // Clone course competencies — batch insert
    const { data: originalCompetencies } = await tq
      .from('course_competencies')
      .select('*')
      .eq('course_id', courseId);

    if (originalCompetencies && originalCompetencies.length > 0) {
      const competencyInserts = originalCompetencies.map(comp => ({
        course_id: newCourse.id,
        competency_id: comp.competency_id,
        proficiency_level: comp.proficiency_level,
        is_primary: comp.is_primary,
      }));

      await tq.from('course_competencies').insert(competencyInserts);
    }

    // Clone quizzes linked to lessons in this course
    const { data: originalQuizzes } = await tq
      .from('quizzes')
      .select('*')
      .eq('course_id', courseId);

    const quizIdMap: Record<string, string> = {};

    if (originalQuizzes && originalQuizzes.length > 0) {
      for (const quiz of originalQuizzes) {
        const {
          id: _qid,
          tenant_id: _qtid,
          course_id: _qcid,
          class_id: _qclid,
          created_at: _qca,
          updated_at: _qua,
          creator_id: _qcrid,
          ...quizFields
        } = quiz;

        // Remap lesson_id if the quiz is tied to a lesson
        const newLessonId = quiz.lesson_id ? lessonIdMap[quiz.lesson_id] : null;

        const { data: newQuiz } = await tq
          .from('quizzes')
          .insert([{
            ...quizFields,
            course_id: newCourse.id,
            lesson_id: newLessonId || null,
            class_id: null, // No class association for cloned course
            creator_id: user.id,
          }])
          .select()
          .single();

        if (newQuiz) {
          quizIdMap[quiz.id] = newQuiz.id;
        }
      }

      // Clone quiz questions for each cloned quiz
      for (const [oldQuizId, newQuizId] of Object.entries(quizIdMap)) {
        const { data: originalQuestions } = await tq
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', oldQuizId)
          .order('order', { ascending: true });

        if (originalQuestions && originalQuestions.length > 0) {
          const questionInserts = originalQuestions.map(q => {
            const {
              id: _qqid,
              tenant_id: _qqtid,
              quiz_id: _qqzid,
              created_at: _qqca,
              updated_at: _qqua,
              ...questionFields
            } = q;
            return {
              ...questionFields,
              quiz_id: newQuizId,
            };
          });

          await tq.from('quiz_questions').insert(questionInserts);
        }
      }
    }

    // Clone assignments linked to lessons in this course
    const { data: originalAssignments } = await tq
      .from('assignments')
      .select('*')
      .eq('course_id', courseId);

    if (originalAssignments && originalAssignments.length > 0) {
      for (const assignment of originalAssignments) {
        const {
          id: _aid,
          tenant_id: _atid,
          course_id: _acid,
          class_id: _aclid,
          created_at: _aca,
          updated_at: _aua,
          creator_id: _acrid,
          ...assignmentFields
        } = assignment;

        const newLessonId = assignment.lesson_id ? lessonIdMap[assignment.lesson_id] : null;

        await tq
          .from('assignments')
          .insert([{
            ...assignmentFields,
            course_id: newCourse.id,
            lesson_id: newLessonId || null,
            class_id: null,
            creator_id: user.id,
          }]);
      }
    }

    // Clone course sections if they exist (course_format support)
    const { data: originalSections } = await tq
      .from('course_sections')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    const sectionIdMap: Record<string, string> = {};

    if (originalSections && originalSections.length > 0) {
      for (const section of originalSections) {
        const {
          id: _secid,
          tenant_id: _sectid,
          course_id: _seccid,
          created_at: _secca,
          updated_at: _secua,
          ...sectionFields
        } = section;

        const { data: newSection } = await tq
          .from('course_sections')
          .insert([{
            ...sectionFields,
            course_id: newCourse.id,
          }])
          .select()
          .single();

        if (newSection) {
          sectionIdMap[section.id] = newSection.id;
        }
      }

      // Update section_id on cloned lessons
      for (const lesson of originalLessons || []) {
        if (lesson.section_id && sectionIdMap[lesson.section_id] && lessonIdMap[lesson.id]) {
          await tq
            .from('lessons')
            .update({ section_id: sectionIdMap[lesson.section_id] })
            .eq('id', lessonIdMap[lesson.id]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Course cloned successfully",
      course: newCourse,
      lessons_cloned: Object.keys(lessonIdMap).length,
      quizzes_cloned: Object.keys(quizIdMap).length,
      assignments_cloned: originalAssignments?.length || 0,
      sections_cloned: Object.keys(sectionIdMap).length,
    });

  } catch (error: any) {
    console.error('Clone error:', error);
    return NextResponse.json({
      error: `Clone failed: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
