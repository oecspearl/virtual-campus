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

    // Create new course (clone)
    const newCourseData = {
      title: newTitle || `Copy of ${originalCourse.title}`,
      description: originalCourse.description,
      thumbnail: originalCourse.thumbnail,
      grade_level: originalCourse.grade_level,
      subject_area: originalCourse.subject_area,
      difficulty: originalCourse.difficulty,
      modality: originalCourse.modality,
      estimated_duration: originalCourse.estimated_duration,
      syllabus: originalCourse.syllabus,
      published: false, // Always start as unpublished
      featured: false,
      creator_id: user.id, // New owner is the person cloning
      category_id: originalCourse.category_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
      }]);

    // Clone lessons
    const { data: originalLessons } = await tq
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    const lessonIdMap: Record<string, string> = {};

    if (originalLessons && originalLessons.length > 0) {
      for (const lesson of originalLessons) {
        const newLessonData = {
          course_id: newCourse.id,
          title: lesson.title,
          description: lesson.description,
          content: lesson.content,
          content_type: lesson.content_type,
          order: lesson.order,
          published: false, // Start unpublished
          estimated_time: lesson.estimated_time,
          difficulty: lesson.difficulty,
          learning_outcomes: lesson.learning_outcomes,
          lesson_instructions: lesson.lesson_instructions,
          resources: lesson.resources,
          prerequisite_lesson_id: null, // Will update after all lessons created
          prerequisite_type: lesson.prerequisite_type,
          prerequisite_min_score: lesson.prerequisite_min_score,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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

          await tq
            .from('lessons')
            .update({ prerequisite_lesson_id: newPrereqId })
            .eq('id', newLessonId);
        }
      }
    }

    // Clone course grade items
    const { data: originalGradeItems } = await tq
      .from('course_grade_items')
      .select('*')
      .eq('course_id', courseId);

    if (originalGradeItems && originalGradeItems.length > 0) {
      for (const item of originalGradeItems) {
        await tq
          .from('course_grade_items')
          .insert([{
            course_id: newCourse.id,
            name: item.name,
            type: item.type,
            weight: item.weight,
            max_score: item.max_score,
            category: item.category,
            order: item.order,
            assessment_id: null, // Don't link to original assessments
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);
      }
    }

    // Clone gradebook settings
    const { data: originalSettings } = await tq
      .from('course_gradebook_settings')
      .select('*')
      .eq('course_id', courseId)
      .single();

    if (originalSettings) {
      await tq
        .from('course_gradebook_settings')
        .insert([{
          course_id: newCourse.id,
          grading_scheme: originalSettings.grading_scheme,
          show_overall_grade: originalSettings.show_overall_grade,
          show_grade_distribution: originalSettings.show_grade_distribution,
          show_class_average: originalSettings.show_class_average,
          weight_ungraded_as_zero: originalSettings.weight_ungraded_as_zero,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
    }

    // Clone course competencies
    const { data: originalCompetencies } = await tq
      .from('course_competencies')
      .select('*')
      .eq('course_id', courseId);

    if (originalCompetencies && originalCompetencies.length > 0) {
      for (const comp of originalCompetencies) {
        await tq
          .from('course_competencies')
          .insert([{
            course_id: newCourse.id,
            competency_id: comp.competency_id,
            proficiency_level: comp.proficiency_level,
            is_primary: comp.is_primary,
          }]);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Course cloned successfully",
      course: newCourse,
      lessons_cloned: Object.keys(lessonIdMap).length,
    });

  } catch (error: any) {
    console.error('Clone error:', error);
    return NextResponse.json({
      error: `Clone failed: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
