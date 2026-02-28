-- Migration 023: Add atomic lesson content append function
-- Prevents read-modify-write race conditions when adding quiz/assignment to lesson content

CREATE OR REPLACE FUNCTION append_lesson_content(
  p_lesson_id UUID,
  p_content_item JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lessons
  SET
    content = COALESCE(content, '[]'::jsonb) || jsonb_build_array(p_content_item),
    updated_at = NOW()
  WHERE id = p_lesson_id
    -- Only append if an item with the same id doesn't already exist
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(content, '[]'::jsonb)) elem
      WHERE elem->>'id' = p_content_item->>'id'
    );
END;
$$;
