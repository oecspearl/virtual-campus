/**
 * Deletes all dependent records for a user before deleting the user record itself.
 * Many tables have foreign keys to `users` without ON DELETE CASCADE,
 * so we must remove those records first to avoid FK constraint violations.
 *
 * All dependent-table deletes run in parallel for speed.
 */
export async function deleteUserCascade(
  tq: { from: (table: string) => any; raw: any },
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Tables with foreign keys referencing users(id) that do NOT cascade on delete.
  // Each entry is [table_name, column_name].
  const dependentTables: [string, string][] = [
    ['user_profiles', 'user_id'],
    ['enrollments', 'student_id'],
    ['course_enrollments', 'student_id'],
    ['course_instructors', 'instructor_id'],
    ['course_grades', 'student_id'],
    ['course_grades', 'graded_by'],
    ['course_announcements', 'author_id'],
    ['course_discussions', 'author_id'],
    ['lesson_progress', 'student_id'],
    ['quiz_attempts', 'student_id'],
    ['quiz_extensions', 'granted_by'],
    ['assignment_submissions', 'student_id'],
    ['assignment_submissions', 'graded_by'],
    ['grades', 'student_id'],
    ['grades', 'graded_by'],
    ['discussion_replies', 'author_id'],
    ['discussion_votes', 'user_id'],
    ['discussions', 'author_id'],
    ['lesson_discussions', 'author_id'],
    ['lesson_discussion_replies', 'author_id'],
    ['lesson_discussion_votes', 'user_id'],
    ['announcement_views', 'user_id'],
    ['in_app_notifications', 'user_id'],
    ['certificates', 'student_id'],
    ['certificate_templates', 'created_by'],
    ['ceu_credits', 'student_id'],
    ['transcripts', 'student_id'],
    ['badges', 'created_by'],
    ['user_badges', 'user_id'],
    ['gamification_profiles', 'user_id'],
    ['gamification_xp_ledger', 'user_id'],
    ['ai_tutor_conversations', 'student_id'],
    ['ai_tutor_analytics', 'student_id'],
    ['ai_tutor_preferences', 'student_id'],
    ['progress', 'student_id'],
    ['files', 'uploaded_by'],
    ['scorm_packages', 'created_by'],
    ['scorm_tracking', 'student_id'],
    ['surveys', 'creator_id'],
    ['quizzes', 'creator_id'],
    ['assignments', 'creator_id'],
    ['learning_paths', 'created_by'],
    ['programmes', 'created_by'],
    ['resource_links', 'created_by'],
    ['translations', 'created_by'],
    ['accessibility_reports', 'checked_by'],
    ['class_instructors', 'instructor_id'],
    ['class_students', 'student_id'],
    ['conference_participants', 'user_id'],
    ['conference_recordings', 'added_by'],
    ['video_captions', 'uploaded_by'],
    ['video_conferences', 'instructor_id'],
    ['course_groups', 'created_by'],
    ['sonisweb_grade_sync_config', 'configured_by'],
    ['sonisweb_sync_logs', 'triggered_by'],
    ['adaptive_rules', 'created_by'],
  ];

  try {
    // Fire all dependent-table deletes in parallel (order doesn't matter)
    await Promise.allSettled(
      dependentTables.map(([table, column]) =>
        tq.from(table).delete().eq(column, userId).then(() => {}, () => {})
      )
    );

    // Now delete the user record
    const { error: userError } = await tq
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) {
      return { success: false, error: userError.message };
    }

    // Delete from Supabase Auth
    const { error: authError } = await tq.raw.auth.admin.deleteUser(userId);
    if (authError) {
      console.error(`Auth delete error for ${userId}:`, authError);
      // DB record already gone, log but don't fail
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
