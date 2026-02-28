-- Create functions for gradebook cleanup

-- Function to find duplicate grade items
CREATE OR REPLACE FUNCTION find_duplicate_grade_items(target_course_id UUID)
RETURNS TABLE (
  id UUID,
  course_id UUID,
  title VARCHAR,
  type VARCHAR,
  assessment_id UUID,
  created_at TIMESTAMPTZ,
  duplicate_rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH duplicates AS (
    SELECT 
      cgi.id,
      cgi.course_id,
      cgi.title,
      cgi.type,
      cgi.assessment_id,
      cgi.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY cgi.course_id, cgi.assessment_id, cgi.type 
        ORDER BY cgi.created_at DESC, cgi.id DESC
      ) as rn
    FROM course_grade_items cgi
    WHERE cgi.course_id = target_course_id
      AND cgi.assessment_id IS NOT NULL
      AND cgi.is_active = true
  )
  SELECT 
    d.id,
    d.course_id,
    d.title,
    d.type,
    d.assessment_id,
    d.created_at,
    d.rn
  FROM duplicates d
  WHERE d.rn > 1
  ORDER BY d.assessment_id, d.type, d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get gradebook statistics
CREATE OR REPLACE FUNCTION get_gradebook_stats(target_course_id UUID)
RETURNS TABLE (
  total_students BIGINT,
  active_grade_items BIGINT,
  inactive_grade_items BIGINT,
  total_grades BIGINT,
  courses_with_orphaned_items BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = target_course_id AND e.status = 'active') as total_students,
    (SELECT COUNT(*) FROM course_grade_items cgi WHERE cgi.course_id = target_course_id AND cgi.is_active = true) as active_grade_items,
    (SELECT COUNT(*) FROM course_grade_items cgi WHERE cgi.course_id = target_course_id AND cgi.is_active = false) as inactive_grade_items,
    (SELECT COUNT(*) FROM course_grades cg WHERE cg.course_id = target_course_id) as total_grades,
    (SELECT COUNT(DISTINCT cgi.course_id) 
     FROM course_grade_items cgi 
     WHERE cgi.course_id = target_course_id 
       AND cgi.is_active = false 
       AND cgi.assessment_id IS NOT NULL
       AND (
         (cgi.type = 'quiz' AND cgi.assessment_id NOT IN (SELECT id FROM quizzes WHERE id IS NOT NULL))
         OR 
         (cgi.type = 'assignment' AND cgi.assessment_id NOT IN (SELECT id FROM assignments WHERE id IS NOT NULL))
       )
    ) as courses_with_orphaned_items;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up specific course gradebook
CREATE OR REPLACE FUNCTION cleanup_course_gradebook(target_course_id UUID)
RETURNS TABLE (
  orphaned_quiz_items BIGINT,
  orphaned_assignment_items BIGINT,
  duplicate_items_removed BIGINT,
  total_inactive_items BIGINT
) AS $$
DECLARE
  orphaned_quizzes BIGINT := 0;
  orphaned_assignments BIGINT := 0;
  duplicates_removed BIGINT := 0;
  total_inactive BIGINT := 0;
BEGIN
  -- Mark orphaned quiz items as inactive
  UPDATE course_grade_items 
  SET is_active = false, updated_at = NOW()
  WHERE course_id = target_course_id
    AND type = 'quiz' 
    AND assessment_id IS NOT NULL
    AND assessment_id NOT IN (SELECT id FROM quizzes WHERE id IS NOT NULL);
  
  GET DIAGNOSTICS orphaned_quizzes = ROW_COUNT;

  -- Mark orphaned assignment items as inactive
  UPDATE course_grade_items 
  SET is_active = false, updated_at = NOW()
  WHERE course_id = target_course_id
    AND type = 'assignment' 
    AND assessment_id IS NOT NULL
    AND assessment_id NOT IN (SELECT id FROM assignments WHERE id IS NOT NULL);
  
  GET DIAGNOSTICS orphaned_assignments = ROW_COUNT;

  -- Remove duplicate grade items (keep most recent)
  WITH duplicates AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY course_id, assessment_id, type 
        ORDER BY created_at DESC, id DESC
      ) as rn
    FROM course_grade_items
    WHERE course_id = target_course_id
      AND assessment_id IS NOT NULL
      AND is_active = true
  )
  UPDATE course_grade_items 
  SET is_active = false, updated_at = NOW()
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS duplicates_removed = ROW_COUNT;

  -- Count total inactive items
  SELECT COUNT(*) INTO total_inactive
  FROM course_grade_items 
  WHERE course_id = target_course_id 
    AND is_active = false;

  RETURN QUERY SELECT orphaned_quizzes, orphaned_assignments, duplicates_removed, total_inactive;
END;
$$ LANGUAGE plpgsql;
